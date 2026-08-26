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

/// What must exist in the frontend store for a menu item to do anything.
///
/// Items whose requirement is unmet are disabled rather than silently doing
/// nothing when clicked.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Requires {
    /// Always available.
    Always,
    /// A source is selected.
    Source,
    /// A layer is selected.
    Layer,
    /// At least one feature is selected.
    Selection,
}

/// A menu item owned by the application. Clicking it emits a menu event
/// carrying `id` to the webview.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Custom {
    pub id: &'static str,
    pub label: &'static str,
    pub accelerator: Option<&'static str>,
    pub requires: Requires,
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
        requires: Requires::Always,
    })
}

const fn custom_with_accelerator(id: &'static str, label: &'static str, accelerator: &'static str) -> Item {
    Item::Custom(Custom {
        id,
        label,
        accelerator: Some(accelerator),
        requires: Requires::Always,
    })
}

const fn requiring(item: Item, requires: Requires) -> Item {
    match item {
        Item::Custom(custom) => Item::Custom(Custom { requires, ..custom }),
        Item::Predefined(predefined) => Item::Predefined(predefined),
    }
}

/// Ids of every custom item gated on `requires`.
pub fn items_requiring(requires: Requires) -> Vec<&'static str> {
    menu_spec()
        .iter()
        .flat_map(|submenu| submenu.items.iter())
        .filter_map(|item| match item {
            Item::Custom(custom) if custom.requires == requires => Some(custom.id),
            _ => None,
        })
        .collect()
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
        requiring(
            custom_with_accelerator(
                "edit.copy-selection-geojson",
                "Copy Selection as GeoJSON",
                "CmdOrCtrl+Shift+C",
            ),
            Requires::Selection,
        ),
        requiring(
            custom_with_accelerator(
                "edit.copy-selection-wkt",
                "Copy Selection as WKT",
                "CmdOrCtrl+Alt+Shift+C",
            ),
            Requires::Selection,
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
        requiring(
            custom("source.show-properties", "Show Properties Table"),
            Requires::Source,
        ),
        requiring(custom("source.zoom-to", "Zoom to Source"), Requires::Source),
        SEPARATOR,
        requiring(custom("source.remove", "Remove Source"), Requires::Source),
    ],
};

const LAYER: Submenu = Submenu {
    title: "Layer",
    prefix: "layer",
    items: &[
        requiring(custom("layer.add-blank", "Add Blank Layer"), Requires::Source),
        requiring(custom("layer.duplicate", "Duplicate Layer"), Requires::Layer),
        SEPARATOR,
        requiring(custom("layer.delete", "Delete Layer"), Requires::Layer),
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
    fn source_items_require_a_selected_source() {
        assert_eq!(
            items_requiring(Requires::Source),
            vec![
                "source.show-properties",
                "source.zoom-to",
                "source.remove",
                "layer.add-blank"
            ]
        );
    }

    #[test]
    fn layer_items_require_a_selected_layer() {
        assert_eq!(
            items_requiring(Requires::Layer),
            vec!["layer.duplicate", "layer.delete"]
        );
    }

    #[test]
    fn copy_items_require_a_selection() {
        assert_eq!(
            items_requiring(Requires::Selection),
            vec!["edit.copy-selection-geojson", "edit.copy-selection-wkt"]
        );
    }

    #[test]
    fn opening_files_is_always_available() {
        assert!(items_requiring(Requires::Always).contains(&"file.open"));
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
