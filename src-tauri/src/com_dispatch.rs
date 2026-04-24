//! Safe wrapper around COM IDispatch for late-bound automation.
//!
//! Excel COM is fundamentally an IDispatch-based automation interface.
//! This module provides [`DispatchObject`] — a thin safe wrapper that
//! maps Rust method calls to `GetIDsOfNames` + `Invoke`, handling
//! VARIANT conversion and HRESULT propagation.
//!
//! All types are `#[cfg(windows)]`-gated; on other platforms the module
//! exposes only [`VbaBridgeError`] so that `vba_bridge.rs` can use it
//! in cross-platform error signatures.

/// Error type for VBA bridge COM operations.
///
/// Replaces the string-based HRESULT tag parsing that the PowerShell
/// bridge relied on. Each variant maps to a distinct failure mode that
/// the frontend routes to a specific dialog.
#[derive(Debug, thiserror::Error)]
pub(crate) enum VbaBridgeError {
    /// A COM call returned a failing HRESULT. The raw code is preserved
    /// so `classify_hresult` in `project.rs` can branch on it directly.
    #[error("COM error (HRESULT 0x{0:08X})")]
    Com(i32),

    /// The workbook reference was null after the connection attempt.
    /// Replaces the `VERDE_WB_NULL` stderr tag from the PS bridge.
    #[error("Workbook not found after connection attempt")]
    WorkbookNull,

    /// `VBProject` is inaccessible — Trust Center setting required.
    /// Replaces the `VERDE_TRUST_DENIED` stderr tag from the PS bridge.
    #[error("VBProject inaccessible — Trust Center setting required")]
    TrustDenied,

    /// The COM operation exceeded the timeout deadline.
    #[error("COM operation timed out after {0}s")]
    Timeout(u64),

    /// Catch-all for non-COM errors (I/O, encoding, etc.).
    #[error("{0}")]
    Other(String),
}

// ── Windows-only implementation ─────────────────────────────────────

#[cfg(windows)]
mod inner {
    use super::VbaBridgeError;
    use std::time::Duration;
    use windows::core::{Interface, BSTR, GUID, PCWSTR};
    use windows::Win32::System::Com::{
        CLSIDFromProgID, CoCreateInstance, CoInitializeEx, CoUninitialize, IDispatch,
        CLSCTX_LOCAL_SERVER, COINIT_APARTMENTTHREADED, DISPATCH_FLAGS, DISPATCH_METHOD,
        DISPATCH_PROPERTYGET, DISPATCH_PROPERTYPUT, DISPPARAMS,
    };
    use windows::Win32::System::Ole::GetActiveObject;
    use windows::Win32::System::Variant::{VARENUM, VARIANT, VT_DISPATCH, VT_EMPTY};

    /// Thin wrapper around a COM `IDispatch` pointer for late-bound
    /// automation. All method/property calls go through
    /// `GetIDsOfNames` + `Invoke`.
    pub(crate) struct DispatchObject {
        inner: IDispatch,
    }

    // IDispatch pointers are prevented from crossing threads by our STA
    // design, but `run_on_sta_thread` needs Send for the channel.
    // Safety: all COM calls happen on a single STA thread — the
    // DispatchObject never actually crosses threads while live.
    unsafe impl Send for DispatchObject {}

    impl DispatchObject {
        /// Wrap an existing `IDispatch` pointer.
        pub(crate) fn from_raw(disp: IDispatch) -> Self {
            Self { inner: disp }
        }

        /// Resolve a single member name to its DISPID.
        fn get_dispid(&self, name: &str) -> Result<i32, VbaBridgeError> {
            let wide: Vec<u16> = name.encode_utf16().chain(std::iter::once(0)).collect();
            let mut dispid = 0i32;
            unsafe {
                self.inner
                    .GetIDsOfNames(
                        &GUID::zeroed(),
                        &PCWSTR(wide.as_ptr()),
                        1,
                        0, // LCID — default
                        &mut dispid,
                    )
                    .map_err(|e| VbaBridgeError::Com(e.code().0))?;
            }
            Ok(dispid)
        }

        /// Low-level `IDispatch::Invoke` wrapper.
        fn invoke(
            &self,
            dispid: i32,
            flags: DISPATCH_FLAGS,
            args: &mut [VARIANT],
        ) -> Result<VARIANT, VbaBridgeError> {
            // IDispatch expects arguments in reverse order.
            args.reverse();

            let mut result = VARIANT::default();
            let mut dp = DISPPARAMS {
                rgvarg: if args.is_empty() {
                    std::ptr::null_mut()
                } else {
                    args.as_mut_ptr()
                },
                cArgs: args.len() as u32,
                rgdispidNamedArgs: std::ptr::null_mut(),
                cNamedArgs: 0,
            };

            // DISPATCH_PROPERTYPUT requires a named arg for DISPID_PROPERTYPUT (-3).
            let mut named_put = -3i32; // DISPID_PROPERTYPUT
            if flags == DISPATCH_PROPERTYPUT {
                dp.rgdispidNamedArgs = &mut named_put;
                dp.cNamedArgs = 1;
            }

            unsafe {
                self.inner
                    .Invoke(
                        dispid,
                        &GUID::zeroed(),
                        0,
                        flags,
                        &dp,
                        Some(&mut result),
                        None,
                        None,
                    )
                    .map_err(|e| VbaBridgeError::Com(e.code().0))?;
            }

            // Restore original order so callers' VARIANT lifetimes are not
            // confused by the reversal.
            args.reverse();

            Ok(result)
        }

        // ── Property get ────────────────────────────────────────────

        /// Get a property that returns another COM object.
        pub(crate) fn get(&self, name: &str) -> Result<DispatchObject, VbaBridgeError> {
            let dispid = self.get_dispid(name)?;
            let result = self.invoke(dispid, DISPATCH_PROPERTYGET, &mut [])?;
            dispatch_from_variant(&result)
        }

        /// Get a property that returns a string.
        pub(crate) fn get_string(&self, name: &str) -> Result<String, VbaBridgeError> {
            let dispid = self.get_dispid(name)?;
            let result = self.invoke(dispid, DISPATCH_PROPERTYGET, &mut [])?;
            string_from_variant(&result)
        }

        /// Get a property that returns an i32.
        pub(crate) fn get_i32(&self, name: &str) -> Result<i32, VbaBridgeError> {
            let dispid = self.get_dispid(name)?;
            let result = self.invoke(dispid, DISPATCH_PROPERTYGET, &mut [])?;
            i32_from_variant(&result)
        }

        /// Get a property that returns a bool.
        #[allow(dead_code)]
        pub(crate) fn get_bool(&self, name: &str) -> Result<bool, VbaBridgeError> {
            let dispid = self.get_dispid(name)?;
            let result = self.invoke(dispid, DISPATCH_PROPERTYGET, &mut [])?;
            bool_from_variant(&result)
        }

        // ── Property put ────────────────────────────────────────────

        /// Set a property to a VARIANT value.
        pub(crate) fn put(&self, name: &str, val: VARIANT) -> Result<(), VbaBridgeError> {
            let dispid = self.get_dispid(name)?;
            self.invoke(dispid, DISPATCH_PROPERTYPUT, &mut [val])?;
            Ok(())
        }

        /// Set a boolean property.
        pub(crate) fn put_bool(&self, name: &str, val: bool) -> Result<(), VbaBridgeError> {
            self.put(name, VARIANT::from(val))
        }

        // ── Method call ─────────────────────────────────────────────

        /// Call a method and return the result as a VARIANT.
        #[allow(dead_code)]
        pub(crate) fn call(
            &self,
            name: &str,
            args: &mut [VARIANT],
        ) -> Result<VARIANT, VbaBridgeError> {
            let dispid = self.get_dispid(name)?;
            self.invoke(dispid, DISPATCH_METHOD, args)
        }

        /// Call a method, discarding the return value.
        pub(crate) fn call_void(
            &self,
            name: &str,
            args: &mut [VARIANT],
        ) -> Result<(), VbaBridgeError> {
            let dispid = self.get_dispid(name)?;
            self.invoke(dispid, DISPATCH_METHOD, args)?;
            Ok(())
        }

        /// Call a method that returns a COM object.
        pub(crate) fn call_get(
            &self,
            name: &str,
            args: &mut [VARIANT],
        ) -> Result<DispatchObject, VbaBridgeError> {
            let dispid = self.get_dispid(name)?;
            let result = self.invoke(dispid, DISPATCH_METHOD, args)?;
            dispatch_from_variant(&result)
        }

        // ── Collection helpers ──────────────────────────────────────

        /// Get the `Count` property (common on COM collections).
        pub(crate) fn count(&self) -> Result<i32, VbaBridgeError> {
            self.get_i32("Count")
        }

        /// Get the `Item(index)` element (1-based, common on COM collections).
        pub(crate) fn item(&self, index: i32) -> Result<DispatchObject, VbaBridgeError> {
            self.call_get("Item", &mut [VARIANT::from(index)])
        }

        /// Convert to a VARIANT for passing as an argument to COM methods
        /// like `VBComponents.Remove(component)`.
        pub(crate) fn into_variant(self) -> VARIANT {
            VARIANT::from(self.inner)
        }

        /// Check if a named property is null/empty on this object.
        /// Used for vbproject_guard equivalence.
        pub(crate) fn is_null_or_empty(&self, name: &str) -> bool {
            let Ok(dispid) = self.get_dispid(name) else {
                return true;
            };
            let Ok(result) = self.invoke(dispid, DISPATCH_PROPERTYGET, &mut []) else {
                return true;
            };
            let vt = result.vt();
            if vt == VT_EMPTY {
                return true;
            }
            if vt == VT_DISPATCH {
                return IDispatch::try_from(&result).is_err();
            }
            false
        }
    }

    // ── VARIANT construction helpers ────────────────────────────────

    /// Create a `VT_BSTR` VARIANT from a Rust string.
    /// Convenience wrapper — more readable than `VARIANT::from(s)` at
    /// call sites like `comp.call_void("Export", &mut [variant_bstr(&path)])`.
    pub(crate) fn variant_bstr(s: &str) -> VARIANT {
        VARIANT::from(s)
    }

    // ── VARIANT extraction helpers ──────────────────────────────────

    fn dispatch_from_variant(v: &VARIANT) -> Result<DispatchObject, VbaBridgeError> {
        IDispatch::try_from(v)
            .map(DispatchObject::from_raw)
            .map_err(|e| VbaBridgeError::Com(e.code().0))
    }

    fn string_from_variant(v: &VARIANT) -> Result<String, VbaBridgeError> {
        // Extract BSTR directly from the VARIANT for VT_BSTR.
        let vt = v.vt();
        if vt == VARENUM(8) {
            // VT_BSTR = 8
            unsafe {
                // bstrVal is ManuallyDrop<BSTR> — borrow without taking ownership.
                let bstr: &BSTR = &v.Anonymous.Anonymous.Anonymous.bstrVal;
                Ok(bstr.to_string())
            }
        } else {
            Err(VbaBridgeError::Other(format!(
                "Expected VT_BSTR, got vt={}",
                vt.0
            )))
        }
    }

    fn i32_from_variant(v: &VARIANT) -> Result<i32, VbaBridgeError> {
        i32::try_from(v).map_err(|e| VbaBridgeError::Com(e.code().0))
    }

    fn bool_from_variant(v: &VARIANT) -> Result<bool, VbaBridgeError> {
        bool::try_from(v).map_err(|e| VbaBridgeError::Com(e.code().0))
    }

    // ── COM instance helpers ────────────────────────────────────────

    /// Create a new COM instance from a ProgID (e.g. "Excel.Application").
    pub(crate) fn create_instance(prog_id: &str) -> Result<DispatchObject, VbaBridgeError> {
        let wide: Vec<u16> = prog_id.encode_utf16().chain(std::iter::once(0)).collect();
        unsafe {
            let clsid = CLSIDFromProgID(PCWSTR(wide.as_ptr()))
                .map_err(|e| VbaBridgeError::Com(e.code().0))?;
            let disp: IDispatch = CoCreateInstance(&clsid, None, CLSCTX_LOCAL_SERVER)
                .map_err(|e| VbaBridgeError::Com(e.code().0))?;
            Ok(DispatchObject::from_raw(disp))
        }
    }

    /// Get a reference to an already-running COM object by ProgID.
    pub(crate) fn get_active_object(prog_id: &str) -> Result<DispatchObject, VbaBridgeError> {
        let wide: Vec<u16> = prog_id.encode_utf16().chain(std::iter::once(0)).collect();
        unsafe {
            let clsid = CLSIDFromProgID(PCWSTR(wide.as_ptr()))
                .map_err(|e| VbaBridgeError::Com(e.code().0))?;
            let mut punk = None;
            GetActiveObject(&clsid, None, &mut punk)
                .map_err(|e| VbaBridgeError::Com(e.code().0))?;
            let unk = punk.ok_or_else(|| {
                VbaBridgeError::Other("GetActiveObject returned null".into())
            })?;
            let disp: IDispatch = unk
                .cast()
                .map_err(|e: windows::core::Error| VbaBridgeError::Com(e.code().0))?;
            Ok(DispatchObject::from_raw(disp))
        }
    }

    // ── STA thread management ───────────────────────────────────────

    /// Run a closure on a dedicated STA COM thread with a timeout.
    ///
    /// Excel COM requires `COINIT_APARTMENTTHREADED`. This function
    /// spawns a new thread, initialises COM in STA mode, runs the
    /// closure, and tears down COM before the thread exits.
    ///
    /// On timeout the thread is abandoned — COM resources will be
    /// cleaned up when the thread eventually finishes or the process
    /// exits. No external `taskkill` is needed (unlike the old
    /// PowerShell bridge).
    pub(crate) fn run_on_sta_thread<F, T>(timeout: Duration, f: F) -> Result<T, VbaBridgeError>
    where
        F: FnOnce() -> Result<T, VbaBridgeError> + Send + 'static,
        T: Send + 'static,
    {
        let (tx, rx) = std::sync::mpsc::channel();
        std::thread::spawn(move || {
            let hr = unsafe { CoInitializeEx(None, COINIT_APARTMENTTHREADED) };
            if hr.is_err() {
                let _ = tx.send(Err(VbaBridgeError::Com(hr.0 as i32)));
                return;
            }
            let result = f();
            unsafe {
                CoUninitialize();
            }
            let _ = tx.send(result);
        });

        match rx.recv_timeout(timeout) {
            Ok(result) => result,
            Err(std::sync::mpsc::RecvTimeoutError::Timeout) => {
                Err(VbaBridgeError::Timeout(timeout.as_secs()))
            }
            Err(e) => Err(VbaBridgeError::Other(format!(
                "COM thread channel error: {e}"
            ))),
        }
    }

    // ── System encoding ─────────────────────────────────────────────

    /// Determine the system's ANSI code page encoding for writing temp
    /// files that Excel's `VBComponents.Import` can read.
    ///
    /// Equivalent to PowerShell's `[System.Text.Encoding]::Default`.
    pub(crate) fn system_encoding() -> &'static encoding_rs::Encoding {
        let acp = unsafe { windows::Win32::Globalization::GetACP() };
        match acp {
            932 => encoding_rs::SHIFT_JIS,
            936 => encoding_rs::GBK,
            949 => encoding_rs::EUC_KR,
            950 => encoding_rs::BIG5,
            1250 => encoding_rs::WINDOWS_1250,
            1251 => encoding_rs::WINDOWS_1251,
            1252 => encoding_rs::WINDOWS_1252,
            1253 => encoding_rs::WINDOWS_1253,
            1254 => encoding_rs::WINDOWS_1254,
            1255 => encoding_rs::WINDOWS_1255,
            1256 => encoding_rs::WINDOWS_1256,
            1257 => encoding_rs::WINDOWS_1257,
            1258 => encoding_rs::WINDOWS_1258,
            874 => encoding_rs::WINDOWS_874,
            _ => encoding_rs::WINDOWS_1252, // Western European fallback
        }
    }
}

#[cfg(windows)]
pub(crate) use inner::*;

#[cfg(test)]
mod tests {
    use super::VbaBridgeError;

    #[test]
    fn vba_bridge_error_com_displays_hex_hresult() {
        let err = VbaBridgeError::Com(0x80070020u32 as i32);
        let msg = err.to_string();
        assert!(
            msg.contains("80070020"),
            "COM error should display HRESULT in hex, got: {msg}"
        );
    }

    #[test]
    fn vba_bridge_error_workbook_null_display() {
        let err = VbaBridgeError::WorkbookNull;
        let msg = err.to_string();
        assert!(
            msg.contains("Workbook"),
            "WorkbookNull should mention workbook, got: {msg}"
        );
    }

    #[test]
    fn vba_bridge_error_trust_denied_display() {
        let err = VbaBridgeError::TrustDenied;
        let msg = err.to_string();
        assert!(
            msg.contains("Trust Center"),
            "TrustDenied should mention Trust Center, got: {msg}"
        );
    }

    #[test]
    fn vba_bridge_error_timeout_display() {
        let err = VbaBridgeError::Timeout(60);
        let msg = err.to_string();
        assert!(
            msg.contains("60"),
            "Timeout should display seconds, got: {msg}"
        );
    }

    #[test]
    fn vba_bridge_error_other_display() {
        let err = VbaBridgeError::Other("test error".into());
        assert_eq!(err.to_string(), "test error");
    }

    #[test]
    fn vba_bridge_error_is_send_and_sync() {
        fn assert_send<T: Send>() {}
        fn assert_sync<T: Sync>() {}
        assert_send::<VbaBridgeError>();
        assert_sync::<VbaBridgeError>();
    }
}
