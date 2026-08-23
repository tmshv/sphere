/// Standard menu items provided by the operating system.
///
/// These are handled natively and never reach the application's menu event
/// handler, so they carry no id.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Predefined {
    About,
    CloseWindow,
    Copy,
    Cut,
    Fullscreen,
    Hide,
    HideOthers,
    Maximize,
    Minimize,
    Paste,
    Quit,
    Redo,
    SelectAll,
    Separator,
    Services,
    ShowAll,
    Undo,
}

/// A menu item owned by the application. Clicking it emits a menu event
/// carrying `id` to the webview.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Custom {
    pub id: &'static str,
    pub label: &'static str,
    pub accelerator: Option<&'static str>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Item {
    Predefined(Predefined),
    Custom(Custom),
}

/// A top-level submenu. Every custom id inside it is namespaced with `prefix`.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Submenu {
    pub title: &'static str,
    pub prefix: &'static str,
    pub items: &'static [Item],
}

const fn predefined(item: Predefined) -> Item {
    Item::Predefined(item)
}

const SEPARATOR: Item = predefined(Predefined::Separator);

const fn custom(id: &'static str, label: &'static str) -> Item {
    Item::Custom(Custom {
        id,
        label,
        accelerator: None,
    })
}

const fn custom_with_accelerator(id: &'static str, label: &'static str, accelerator: &'static str) -> Item {
    Item::Custom(Custom {
        id,
        label,
        accelerator: Some(accelerator),
    })
}

/// Toggles are plain items rather than check items: the menu lives in the
/// backend while the state it toggles lives in the frontend store, so a
/// checkmark here could not be trusted to reflect what the map is showing.
const APP: Submenu = Submenu {
    title: "Sphere",
    prefix: "app",
    items: &[
        predefined(Predefined::About),
        SEPARATOR,
        predefined(Predefined::Services),
        SEPARATOR,
        predefined(Predefined::Hide),
        predefined(Predefined::HideOthers),
        predefined(Predefined::ShowAll),
        SEPARATOR,
        predefined(Predefined::Quit),
    ],
};

const FILE: Submenu = Submenu {
    title: "File",
    prefix: "file",
    items: &[
        custom_with_accelerator("file.open", "Open…", "CmdOrCtrl+O"),
        SEPARATOR,
        predefined(Predefined::CloseWindow),
    ],
};

const EDIT: Submenu = Submenu {
    title: "Edit",
    prefix: "edit",
    items: &[
        predefined(Predefined::Undo),
        predefined(Predefined::Redo),
        SEPARATOR,
        predefined(Predefined::Cut),
        predefined(Predefined::Copy),
        predefined(Predefined::Paste),
        predefined(Predefined::SelectAll),
        SEPARATOR,
        custom_with_accelerator(
            "edit.copy-selection-geojson",
            "Copy Selection as GeoJSON",
            "CmdOrCtrl+Shift+C",
        ),
        custom_with_accelerator(
            "edit.copy-selection-wkt",
            "Copy Selection as WKT",
            "CmdOrCtrl+Alt+Shift+C",
        ),
    ],
};

const VIEW: Submenu = Submenu {
    title: "View",
    prefix: "view",
    items: &[
        custom_with_accelerator("view.toggle-left-sidebar", "Toggle Left Sidebar", "CmdOrCtrl+B"),
        custom_with_accelerator("view.toggle-right-sidebar", "Toggle Right Sidebar", "CmdOrCtrl+Alt+B"),
        SEPARATOR,
        custom_with_accelerator("view.toggle-zen-mode", "Toggle Zen Mode", "Ctrl+Cmd+F"),
        custom("view.toggle-dark-theme", "Toggle Dark Theme"),
        SEPARATOR,
        custom("view.toggle-terrain", "Toggle Terrain"),
        custom("view.toggle-sky", "Toggle Sky"),
        custom("view.toggle-tile-boundaries", "Toggle Tile Boundaries"),
        SEPARATOR,
        predefined(Predefined::Fullscreen),
    ],
};

const SOURCE: Submenu = Submenu {
    title: "Source",
    prefix: "source",
    items: &[
        custom("source.show-properties", "Show Properties Table"),
        custom("source.zoom-to", "Zoom to Source"),
        SEPARATOR,
        custom("source.remove", "Remove Source"),
    ],
};

const LAYER: Submenu = Submenu {
    title: "Layer",
    prefix: "layer",
    items: &[
        custom("layer.add-blank", "Add Blank Layer"),
        custom("layer.duplicate", "Duplicate Layer"),
        SEPARATOR,
        custom("layer.delete", "Delete Layer"),
    ],
};

const WINDOW: Submenu = Submenu {
    title: "Window",
    prefix: "window",
    items: &[predefined(Predefined::Minimize), predefined(Predefined::Maximize)],
};

/// The whole application menu, as data.
pub fn menu_spec() -> &'static [Submenu] {
    &[APP, FILE, EDIT, VIEW, SOURCE, LAYER, WINDOW]
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashSet;

    fn custom_items() -> Vec<(&'static Submenu, &'static Custom)> {
        menu_spec()
            .iter()
            .flat_map(|submenu| {
                submenu.items.iter().filter_map(move |item| match item {
                    Item::Custom(custom) => Some((submenu, custom)),
                    Item::Predefined(_) => None,
                })
            })
            .collect()
    }

    #[test]
    fn has_the_expected_top_level_submenus() {
        let titles: Vec<&str> = menu_spec().iter().map(|submenu| submenu.title).collect();

        assert_eq!(
            titles,
            vec!["Sphere", "File", "Edit", "View", "Source", "Layer", "Window"]
        );
    }

    #[test]
    fn custom_ids_are_unique() {
        let mut seen = HashSet::new();

        for (_, custom) in custom_items() {
            assert!(seen.insert(custom.id), "duplicate menu id: {}", custom.id);
        }
    }

    #[test]
    fn custom_ids_are_namespaced_by_their_submenu() {
        for (submenu, custom) in custom_items() {
            let expected = format!("{}.", submenu.prefix);
            assert!(
                custom.id.starts_with(&expected),
                "id {} is not namespaced with {}",
                custom.id,
                expected
            );
        }
    }

    #[test]
    fn custom_items_have_labels() {
        for (_, custom) in custom_items() {
            assert!(!custom.label.is_empty(), "menu item {} has no label", custom.id);
        }
    }

    #[test]
    fn accelerators_are_unique() {
        let mut seen = HashSet::new();

        for (_, custom) in custom_items() {
            let Some(accelerator) = custom.accelerator else {
                continue;
            };
            assert!(seen.insert(accelerator), "accelerator {} is used twice", accelerator);
        }
    }

    #[test]
    fn opens_files_from_the_file_menu() {
        let ids: Vec<&str> = custom_items().iter().map(|(_, custom)| custom.id).collect();

        assert!(ids.contains(&"file.open"));
    }

    #[test]
    fn every_submenu_ends_without_a_trailing_separator() {
        for submenu in menu_spec() {
            assert_ne!(
                submenu.items.last(),
                Some(&Item::Predefined(Predefined::Separator)),
                "submenu {} ends with a separator",
                submenu.title
            );
        }
    }
}
