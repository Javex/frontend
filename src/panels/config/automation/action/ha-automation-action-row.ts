import { ActionDetail } from "@material/mwc-list/mwc-list-foundation";
import "@material/mwc-list/mwc-list-item";
import {
  mdiArrowDown,
  mdiArrowUp,
  mdiCheck,
  mdiContentDuplicate,
  mdiDelete,
  mdiDotsVertical,
  mdiPlay,
  mdiPlayCircleOutline,
  mdiRenameBox,
  mdiStopCircleOutline,
} from "@mdi/js";
import { css, CSSResultGroup, html, LitElement, PropertyValues } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { dynamicElement } from "../../../../common/dom/dynamic-element-directive";
import { fireEvent } from "../../../../common/dom/fire_event";
import { handleStructError } from "../../../../common/structs/handle-errors";
import "../../../../components/ha-alert";
import "../../../../components/ha-button-menu";
import "../../../../components/ha-card";
import "../../../../components/ha-icon-button";
import "../../../../components/ha-expansion-panel";
import type { HaYamlEditor } from "../../../../components/ha-yaml-editor";
import { validateConfig } from "../../../../data/config";
import { Action, getActionType } from "../../../../data/script";
import { describeAction } from "../../../../data/script_i18n";
import { callExecuteScript } from "../../../../data/service";
import {
  showAlertDialog,
  showConfirmationDialog,
  showPromptDialog,
} from "../../../../dialogs/generic/show-dialog-box";
import { haStyle } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import { showToast } from "../../../../util/toast";
import "./types/ha-automation-action-activate_scene";
import "./types/ha-automation-action-choose";
import "./types/ha-automation-action-condition";
import "./types/ha-automation-action-delay";
import "./types/ha-automation-action-device_id";
import "./types/ha-automation-action-event";
import "./types/ha-automation-action-if";
import "./types/ha-automation-action-parallel";
import "./types/ha-automation-action-play_media";
import "./types/ha-automation-action-repeat";
import "./types/ha-automation-action-service";
import "./types/ha-automation-action-stop";
import "./types/ha-automation-action-wait_for_trigger";
import "./types/ha-automation-action-wait_template";
import { ACTION_TYPES } from "../../../../data/action";
import { capitalizeFirstLetter } from "../../../../common/string/capitalize-first-letter";

const getType = (action: Action | undefined) => {
  if (!action) {
    return undefined;
  }
  if ("service" in action || "scene" in action) {
    return getActionType(action);
  }
  if (["and", "or", "not"].some((key) => key in action)) {
    return "condition";
  }
  return Object.keys(ACTION_TYPES).find((option) => option in action);
};

declare global {
  // for fire event
  interface HASSDomEvents {
    "move-action": { direction: "up" | "down" };
  }
}

export interface ActionElement extends LitElement {
  action: Action;
}

export const handleChangeEvent = (element: ActionElement, ev: CustomEvent) => {
  ev.stopPropagation();
  const name = (ev.target as any)?.name;
  if (!name) {
    return;
  }
  const newVal = ev.detail?.value || (ev.target as any).value;

  if ((element.action[name] || "") === newVal) {
    return;
  }

  let newAction: Action;
  if (!newVal) {
    newAction = { ...element.action };
    delete newAction[name];
  } else {
    newAction = { ...element.action, [name]: newVal };
  }
  fireEvent(element, "value-changed", { value: newAction });
};

const preventDefault = (ev) => ev.preventDefault();

@customElement("ha-automation-action-row")
export default class HaAutomationActionRow extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public action!: Action;

  @property() public index!: number;

  @property() public totalActions!: number;

  @property({ type: Boolean }) public narrow = false;

  @state() private _warnings?: string[];

  @state() private _uiModeAvailable = true;

  @state() private _yamlMode = false;

  @query("ha-yaml-editor") private _yamlEditor?: HaYamlEditor;

  protected willUpdate(changedProperties: PropertyValues) {
    if (!changedProperties.has("action")) {
      return;
    }
    this._uiModeAvailable = getType(this.action) !== undefined;
    if (!this._uiModeAvailable && !this._yamlMode) {
      this._yamlMode = true;
    }
  }

  protected updated(changedProperties: PropertyValues) {
    if (!changedProperties.has("action")) {
      return;
    }
    if (this._yamlMode) {
      const yamlEditor = this._yamlEditor;
      if (yamlEditor && yamlEditor.value !== this.action) {
        yamlEditor.setValue(this.action);
      }
    }
  }

  protected render() {
    const type = getType(this.action);
    const yamlMode = this._yamlMode;

    return html`
      <ha-card outlined>
        ${this.action.enabled === false
          ? html`<div class="disabled-bar">
              ${this.hass.localize(
                "ui.panel.config.automation.editor.actions.disabled"
              )}
            </div>`
          : ""}
        <ha-expansion-panel
          leftChevron
          .header=${capitalizeFirstLetter(
            describeAction(this.hass, this.action)
          )}
        >
          ${this.index !== 0
            ? html`
                <ha-icon-button
                  slot="icons"
                  .label=${this.hass.localize(
                    "ui.panel.config.automation.editor.move_up"
                  )}
                  .path=${mdiArrowUp}
                  @click=${this._moveUp}
                ></ha-icon-button>
              `
            : ""}
          ${this.index !== this.totalActions - 1
            ? html`
                <ha-icon-button
                  slot="icons"
                  .label=${this.hass.localize(
                    "ui.panel.config.automation.editor.move_down"
                  )}
                  .path=${mdiArrowDown}
                  @click=${this._moveDown}
                ></ha-icon-button>
              `
            : ""}
          <ha-button-menu
            slot="icons"
            fixed
            corner="BOTTOM_START"
            @action=${this._handleAction}
            @click=${preventDefault}
          >
            <ha-icon-button
              slot="trigger"
              .label=${this.hass.localize("ui.common.menu")}
              .path=${mdiDotsVertical}
            ></ha-icon-button>
            <mwc-list-item graphic="icon">
              ${this.hass.localize(
                "ui.panel.config.automation.editor.actions.run"
              )}
              <ha-svg-icon slot="graphic" .path=${mdiPlay}></ha-svg-icon>
            </mwc-list-item>

            <mwc-list-item graphic="icon">
              ${this.hass.localize(
                "ui.panel.config.automation.editor.actions.rename"
              )}
              <ha-svg-icon slot="graphic" .path=${mdiRenameBox}></ha-svg-icon>
            </mwc-list-item>
            <mwc-list-item graphic="icon">
              ${this.hass.localize(
                "ui.panel.config.automation.editor.actions.duplicate"
              )}
              <ha-svg-icon
                slot="graphic"
                .path=${mdiContentDuplicate}
              ></ha-svg-icon>
            </mwc-list-item>

            <li divider role="separator"></li>

            <mwc-list-item .disabled=${!this._uiModeAvailable} graphic="icon">
              ${this.hass.localize("ui.panel.config.automation.editor.edit_ui")}
              ${!yamlMode
                ? html`<ha-svg-icon
                    slot="graphic"
                    .path=${mdiCheck}
                  ></ha-svg-icon>`
                : ``}
            </mwc-list-item>

            <mwc-list-item .disabled=${!this._uiModeAvailable} graphic="icon">
              ${this.hass.localize(
                "ui.panel.config.automation.editor.edit_yaml"
              )}
              ${yamlMode
                ? html`<ha-svg-icon
                    slot="graphic"
                    .path=${mdiCheck}
                  ></ha-svg-icon>`
                : ``}
            </mwc-list-item>

            <li divider role="separator"></li>

            <mwc-list-item graphic="icon">
              ${this.action.enabled === false
                ? this.hass.localize(
                    "ui.panel.config.automation.editor.actions.enable"
                  )
                : this.hass.localize(
                    "ui.panel.config.automation.editor.actions.disable"
                  )}
              <ha-svg-icon
                slot="graphic"
                .path=${this.action.enabled === false
                  ? mdiPlayCircleOutline
                  : mdiStopCircleOutline}
              ></ha-svg-icon>
            </mwc-list-item>
            <mwc-list-item class="warning" graphic="icon">
              ${this.hass.localize(
                "ui.panel.config.automation.editor.actions.delete"
              )}
              <ha-svg-icon
                class="warning"
                slot="graphic"
                .path=${mdiDelete}
              ></ha-svg-icon>
            </mwc-list-item>
          </ha-button-menu>
          <div
            class=${classMap({
              "card-content": true,
              disabled: this.action.enabled === false,
            })}
          >
            ${this._warnings
              ? html`<ha-alert
                  alert-type="warning"
                  .title=${this.hass.localize(
                    "ui.errors.config.editor_not_supported"
                  )}
                >
                  ${this._warnings!.length > 0 &&
                  this._warnings![0] !== undefined
                    ? html` <ul>
                        ${this._warnings!.map(
                          (warning) => html`<li>${warning}</li>`
                        )}
                      </ul>`
                    : ""}
                  ${this.hass.localize(
                    "ui.errors.config.edit_in_yaml_supported"
                  )}
                </ha-alert>`
              : ""}
            ${yamlMode
              ? html`
                  ${type === undefined
                    ? html`
                        ${this.hass.localize(
                          "ui.panel.config.automation.editor.actions.unsupported_action",
                          "action",
                          type
                        )}
                      `
                    : ""}
                  <ha-yaml-editor
                    .hass=${this.hass}
                    .defaultValue=${this.action}
                    @value-changed=${this._onYamlChange}
                  ></ha-yaml-editor>
                `
              : html`
                  <div @ui-mode-not-available=${this._handleUiModeNotAvailable}>
                    ${dynamicElement(`ha-automation-action-${type}`, {
                      hass: this.hass,
                      action: this.action,
                      narrow: this.narrow,
                    })}
                  </div>
                `}
          </div>
        </ha-expansion-panel>
      </ha-card>
    `;
  }

  private _handleUiModeNotAvailable(ev: CustomEvent) {
    // Prevent possible parent action-row from switching to yamlMode
    ev.stopPropagation();

    this._warnings = handleStructError(this.hass, ev.detail).warnings;
    if (!this._yamlMode) {
      this._yamlMode = true;
    }
  }

  private _moveUp(ev) {
    ev.preventDefault();
    fireEvent(this, "move-action", { direction: "up" });
  }

  private _moveDown(ev) {
    ev.preventDefault();
    fireEvent(this, "move-action", { direction: "down" });
  }

  private async _handleAction(ev: CustomEvent<ActionDetail>) {
    switch (ev.detail.index) {
      case 0:
        this._runAction();
        break;
      case 1:
        await this._renameAction();
        break;
      case 2:
        fireEvent(this, "duplicate");
        break;
      case 3:
        this._switchUiMode();
        this.expand();
        break;
      case 4:
        this._switchYamlMode();
        this.expand();
        break;
      case 5:
        this._onDisable();
        break;
      case 6:
        this._onDelete();
        break;
    }
  }

  private _onDisable() {
    const enabled = !(this.action.enabled ?? true);
    const value = { ...this.action, enabled };
    fireEvent(this, "value-changed", { value });
    if (this._yamlMode) {
      this._yamlEditor?.setValue(value);
    }
  }

  private async _runAction() {
    const validated = await validateConfig(this.hass, {
      action: this.action,
    });

    if (!validated.action.valid) {
      showAlertDialog(this, {
        title: this.hass.localize(
          "ui.panel.config.automation.editor.actions.invalid_action"
        ),
        text: validated.action.error,
      });
      return;
    }

    try {
      await callExecuteScript(this.hass, this.action);
    } catch (err: any) {
      showAlertDialog(this, {
        title: this.hass.localize(
          "ui.panel.config.automation.editor.actions.run_action_error"
        ),
        text: err.message || err,
      });
      return;
    }

    showToast(this, {
      message: this.hass.localize(
        "ui.panel.config.automation.editor.actions.run_action_success"
      ),
    });
  }

  private _onDelete() {
    showConfirmationDialog(this, {
      text: this.hass.localize(
        "ui.panel.config.automation.editor.actions.delete_confirm"
      ),
      dismissText: this.hass.localize("ui.common.cancel"),
      confirmText: this.hass.localize("ui.common.delete"),
      confirm: () => {
        fireEvent(this, "value-changed", { value: null });
      },
    });
  }

  private _onYamlChange(ev: CustomEvent) {
    ev.stopPropagation();
    if (!ev.detail.isValid) {
      return;
    }
    fireEvent(this, "value-changed", { value: ev.detail.value });
  }

  private _switchUiMode() {
    this._warnings = undefined;
    this._yamlMode = false;
  }

  private _switchYamlMode() {
    this._warnings = undefined;
    this._yamlMode = true;
  }

  private async _renameAction(): Promise<void> {
    const alias = await showPromptDialog(this, {
      title: this.hass.localize(
        "ui.panel.config.automation.editor.actions.change_alias"
      ),
      inputLabel: this.hass.localize(
        "ui.panel.config.automation.editor.actions.alias"
      ),
      inputType: "string",
      placeholder: capitalizeFirstLetter(
        describeAction(this.hass, this.action, undefined, true)
      ),
      defaultValue: this.action.alias,
      confirmText: this.hass.localize("ui.common.submit"),
    });
    const value = { ...this.action };
    if (!alias) {
      delete value.alias;
    } else {
      value.alias = alias;
    }
    fireEvent(this, "value-changed", {
      value,
    });
    if (this._yamlMode) {
      this._yamlEditor?.setValue(value);
    }
  }

  public expand() {
    this.updateComplete.then(() => {
      this.shadowRoot!.querySelector("ha-expansion-panel")!.expanded = true;
    });
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        ha-button-menu,
        ha-icon-button {
          --mdc-theme-text-primary-on-background: var(--primary-text-color);
        }
        .disabled {
          opacity: 0.5;
          pointer-events: none;
        }
        ha-expansion-panel {
          --expansion-panel-summary-padding: 0 0 0 8px;
          --expansion-panel-content-padding: 0;
        }
        .card-content {
          padding: 16px;
        }
        .disabled-bar {
          background: var(--divider-color, #e0e0e0);
          text-align: center;
          border-top-right-radius: var(--ha-card-border-radius);
          border-top-left-radius: var(--ha-card-border-radius);
        }

        mwc-list-item[disabled] {
          --mdc-theme-text-primary-on-background: var(--disabled-text-color);
        }
        .warning ul {
          margin: 4px 0;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-action-row": HaAutomationActionRow;
  }
}
