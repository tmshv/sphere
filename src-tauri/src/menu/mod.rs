pub mod spec;

use serde::Serialize;
use tauri::menu::{Menu, MenuBuilder, MenuEvent, MenuItemBuilder, Submenu, SubmenuBuilder};
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
                let mut item = MenuItemBuilder::with_id(custom.id, custom.label);
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
    fn serializes_the_clicked_item_id() {
        let payload = MenuEventPayload {
            id: "file.open".to_string(),
        };

        let json = serde_json::to_string(&payload).expect("payload should serialize");

        assert_eq!(json, r#"{"id":"file.open"}"#);
    }
}
