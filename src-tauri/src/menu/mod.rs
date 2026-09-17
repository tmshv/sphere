pub mod spec;

use serde::{Deserialize, Serialize};
use tauri::menu::{Menu, MenuBuilder, MenuEvent, MenuItem, MenuItemBuilder, Submenu, SubmenuBuilder};
use tauri::{AppHandle, Emitter, Runtime};

/// Label of the window the menu talks to. The properties window has its own
/// webview and must not react to menu clicks.
const MAIN_WINDOW: &str = "main";

/// Name of the event emitted to the webview when a custom menu item is clicked.
const MENU_EVENT: &str = "menu";

#[derive(Clone, Serialize)]
struct MenuEventPayload {
    id: String,
}

/// What the frontend store currently holds. The spec decides which items each
/// flag governs, so this stays a description of state rather than a list of ids.
#[derive(Debug, Clone, Copy, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Context {
    pub has_source: bool,
    pub has_layer: bool,
    pub has_selection: bool,
}

/// Enables or disables the context-dependent items to match the frontend store.
pub fn set_context<R: Runtime>(app: &AppHandle<R>, context: Context) -> tauri::Result<()> {
    let handle = app.clone();

    // Menu items may only be touched on the main thread.
    app.run_on_main_thread(move || {
        if let Err(err) = apply_context(&handle, context) {
            eprintln!("Failed to update menu state: {err}");
        }
    })
}

fn apply_context<R: Runtime>(app: &AppHandle<R>, context: Context) -> tauri::Result<()> {
    let Some(menu) = app.menu() else {
        return Ok(());
    };

    let requirements = [
        (spec::Requires::Source, context.has_source),
        (spec::Requires::Layer, context.has_layer),
        (spec::Requires::Selection, context.has_selection),
    ];

    for (requires, enabled) in requirements {
        for id in spec::items_requiring(requires) {
            let Some(item) = find_item(&menu, id) else {
                continue;
            };
            item.set_enabled(enabled)?;
        }
    }

    Ok(())
}

fn find_item<R: Runtime>(menu: &Menu<R>, id: &str) -> Option<MenuItem<R>> {
    let items = menu.items().ok()?;

    items.into_iter().find_map(|kind| {
        let submenu = kind.as_submenu()?;
        submenu.get(id)?.as_menuitem().cloned()
    })
}

/// Builds the native application menu described by [`spec::menu_spec`].
pub fn build<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<Menu<R>> {
    let mut builder = MenuBuilder::new(app);

    for submenu in spec::menu_spec() {
        builder = builder.item(&build_submenu(app, submenu)?);
    }

    builder.build()
}

/// Forwards a click on a custom menu item to the main webview. Predefined items
/// are handled by the operating system and never reach this function.
pub fn on_event<R: Runtime>(app: &AppHandle<R>, event: MenuEvent) {
    let id = event.id().0.clone();
    let payload = MenuEventPayload { id: id.clone() };

    if let Err(err) = app.emit_to(MAIN_WINDOW, MENU_EVENT, payload) {
        eprintln!("Failed to emit menu event {id}: {err}");
    }
}

fn build_submenu<R: Runtime>(app: &AppHandle<R>, submenu: &spec::Submenu) -> tauri::Result<Submenu<R>> {
    let mut builder = SubmenuBuilder::new(app, submenu.title);

    for item in submenu.items {
        builder = match item {
            spec::Item::Predefined(predefined) => add_predefined(builder, *predefined),
            spec::Item::Custom(custom) => {
                // Items gated on frontend state start disabled: nothing is
                // selected until the webview says otherwise.
                let mut item = MenuItemBuilder::with_id(custom.id, custom.label)
                    .enabled(custom.requires == spec::Requires::Always);
                if let Some(accelerator) = custom.accelerator {
                    item = item.accelerator(accelerator);
                }
                builder.item(&item.build(app)?)
            }
        };
    }

    builder.build()
}

fn add_predefined<R: Runtime>(
    builder: SubmenuBuilder<'_, R, AppHandle<R>>,
    predefined: spec::Predefined,
) -> SubmenuBuilder<'_, R, AppHandle<R>> {
    match predefined {
        spec::Predefined::About => builder.about(None),
        spec::Predefined::CloseWindow => builder.close_window(),
        spec::Predefined::Copy => builder.copy(),
        spec::Predefined::Cut => builder.cut(),
        spec::Predefined::Fullscreen => builder.fullscreen(),
        spec::Predefined::Hide => builder.hide(),
        spec::Predefined::HideOthers => builder.hide_others(),
        spec::Predefined::Maximize => builder.maximize(),
        spec::Predefined::Minimize => builder.minimize(),
        spec::Predefined::Paste => builder.paste(),
        spec::Predefined::Quit => builder.quit(),
        spec::Predefined::Redo => builder.redo(),
        spec::Predefined::SelectAll => builder.select_all(),
        spec::Predefined::Separator => builder.separator(),
        spec::Predefined::Services => builder.services(),
        spec::Predefined::ShowAll => builder.show_all(),
        spec::Predefined::Undo => builder.undo(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // `build` itself has no unit test: `muda` refuses to create menu items off
    // the main thread, and `cargo test` runs every test on a spawned one.

    #[test]
    fn accepts_the_context_payload_sent_by_the_webview() {
        let json = r#"{"hasSource":true,"hasLayer":false,"hasSelection":true}"#;

        let context: Context = serde_json::from_str(json).expect("payload should deserialize");

        assert!(context.has_source);
        assert!(!context.has_layer);
        assert!(context.has_selection);
    }

    #[test]
    fn serializes_the_clicked_item_id() {
        let payload = MenuEventPayload {
            id: "file.open".to_string(),
        };

        let json = serde_json::to_string(&payload).expect("payload should serialize");

        assert_eq!(json, r#"{"id":"file.open"}"#);
    }
}
