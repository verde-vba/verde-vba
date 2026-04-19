use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct EditorSettings {
    #[serde(default = "default_font_size")]
    pub font_size: u32,
    #[serde(default = "default_font_family")]
    pub font_family: String,
    #[serde(default = "default_tab_size")]
    pub tab_size: u32,
    #[serde(default = "default_word_wrap")]
    pub word_wrap: String,
    #[serde(default = "default_true")]
    pub minimap: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SyncSettings {
    #[serde(default = "default_true")]
    pub auto_sync_to_excel: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Settings {
    #[serde(default = "default_theme")]
    pub theme: String,
    #[serde(default = "default_language")]
    pub language: String,
    #[serde(default)]
    pub editor: EditorSettings,
    #[serde(default)]
    pub sync: SyncSettings,
}

fn default_font_size() -> u32 {
    14
}
fn default_font_family() -> String {
    "'Cascadia Code', 'Consolas', monospace".to_string()
}
fn default_tab_size() -> u32 {
    4
}
fn default_word_wrap() -> String {
    "off".to_string()
}
fn default_true() -> bool {
    true
}
fn default_theme() -> String {
    "system".to_string()
}
fn default_language() -> String {
    "auto".to_string()
}

impl Default for EditorSettings {
    fn default() -> Self {
        Self {
            font_size: default_font_size(),
            font_family: default_font_family(),
            tab_size: default_tab_size(),
            word_wrap: default_word_wrap(),
            minimap: default_true(),
        }
    }
}

impl Default for SyncSettings {
    fn default() -> Self {
        Self {
            auto_sync_to_excel: default_true(),
        }
    }
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            theme: default_theme(),
            language: default_language(),
            editor: EditorSettings::default(),
            sync: SyncSettings::default(),
        }
    }
}

impl Settings {
    fn settings_path() -> PathBuf {
        let appdata = std::env::var("APPDATA").unwrap_or_else(|_| {
            let home = std::env::var("HOME").unwrap_or_default();
            Path::new(&home)
                .join(".config")
                .to_string_lossy()
                .to_string()
        });
        Path::new(&appdata).join("verde").join("settings.json")
    }

    pub fn load() -> Result<Self, Box<dyn std::error::Error>> {
        let path = Self::settings_path();
        if path.exists() {
            let content = std::fs::read_to_string(&path)?;
            Ok(serde_json::from_str(&content)?)
        } else {
            Ok(Self::default())
        }
    }

    pub fn save(&self) -> Result<(), Box<dyn std::error::Error>> {
        let path = Self::settings_path();
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)?;
        }
        let content = serde_json::to_string_pretty(self)?;
        std::fs::write(&path, content)?;
        Ok(())
    }
}
