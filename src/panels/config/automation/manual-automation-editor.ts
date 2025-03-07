import "@material/mwc-button/mwc-button";
import { mdiHelpCircle } from "@mdi/js";
import { HassEntity } from "home-assistant-js-websocket";
import { css, CSSResultGroup, html, LitElement, PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/entity/ha-entity-toggle";
import "../../../components/ha-card";
import "../../../components/ha-textarea";
import "../../../components/ha-textfield";
import "../../../components/ha-icon-button";
import {
  AUTOMATION_DEFAULT_MODE,
  Condition,
  ManualAutomationConfig,
  Trigger,
  triggerAutomationActions,
} from "../../../data/automation";
import { Action, isMaxMode, MODES } from "../../../data/script";
import { haStyle } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";
import { documentationUrl } from "../../../util/documentation-url";
import "./action/ha-automation-action";
import "./condition/ha-automation-condition";
import "./trigger/ha-automation-trigger";

@customElement("manual-automation-editor")
export class HaManualAutomationEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public isWide!: boolean;

  @property({ type: Boolean }) public narrow!: boolean;

  @property({ attribute: false }) public config!: ManualAutomationConfig;

  @property({ attribute: false }) public stateObj?: HassEntity;

  @state() private _showDescription = false;

  protected render() {
    return html`
      <ha-card outlined>
        <div class="card-content">
          <ha-textfield
            .label=${this.hass.localize(
              "ui.panel.config.automation.editor.alias"
            )}
            name="alias"
            .value=${this.config.alias || ""}
            @change=${this._valueChanged}
          >
          </ha-textfield>
          ${this._showDescription
            ? html`
                <ha-textarea
                  .label=${this.hass.localize(
                    "ui.panel.config.automation.editor.description.label"
                  )}
                  .placeholder=${this.hass.localize(
                    "ui.panel.config.automation.editor.description.placeholder"
                  )}
                  name="description"
                  autogrow
                  .value=${this.config.description || ""}
                  @change=${this._valueChanged}
                ></ha-textarea>
              `
            : html`
                <div class="link-button-row">
                  <button class="link" @click=${this._addDescription}>
                    ${this.hass.localize(
                      "ui.panel.config.automation.editor.description.add"
                    )}
                  </button>
                </div>
              `}
          <ha-select
            .label=${this.hass.localize(
              "ui.panel.config.automation.editor.modes.label"
            )}
            .value=${this.config.mode || AUTOMATION_DEFAULT_MODE}
            @selected=${this._modeChanged}
            fixedMenuPosition
            .helper=${html`
              <a
                style="color: var(--secondary-text-color)"
                href=${documentationUrl(this.hass, "/docs/automation/modes/")}
                target="_blank"
                rel="noreferrer"
                >${this.hass.localize(
                  "ui.panel.config.automation.editor.modes.learn_more"
                )}</a
              >
            `}
          >
            ${MODES.map(
              (mode) => html`
                <mwc-list-item .value=${mode}>
                  ${this.hass.localize(
                    `ui.panel.config.automation.editor.modes.${mode}`
                  ) || mode}
                </mwc-list-item>
              `
            )}
          </ha-select>
          ${this.config.mode && isMaxMode(this.config.mode)
            ? html`
                <br /><ha-textfield
                  .label=${this.hass.localize(
                    `ui.panel.config.automation.editor.max.${this.config.mode}`
                  )}
                  type="number"
                  name="max"
                  .value=${this.config.max || "10"}
                  @change=${this._valueChanged}
                  class="max"
                >
                </ha-textfield>
              `
            : html``}
        </div>
        ${this.stateObj
          ? html`
              <div class="card-actions layout horizontal justified center">
                <div class="layout horizontal center">
                  <ha-entity-toggle
                    .hass=${this.hass}
                    .stateObj=${this.stateObj!}
                  ></ha-entity-toggle>
                  ${this.hass.localize(
                    "ui.panel.config.automation.editor.enable_disable"
                  )}
                </div>
                <div>
                  <a href="/config/automation/trace/${this.config.id}">
                    <mwc-button>
                      ${this.hass.localize(
                        "ui.panel.config.automation.editor.show_trace"
                      )}
                    </mwc-button>
                  </a>
                  <mwc-button
                    @click=${this._runActions}
                    .stateObj=${this.stateObj}
                  >
                    ${this.hass.localize("ui.card.automation.trigger")}
                  </mwc-button>
                </div>
              </div>
            `
          : ""}
      </ha-card>

      <div class="header">
        <div class="name">
          ${this.hass.localize(
            "ui.panel.config.automation.editor.triggers.header"
          )}
        </div>
        <a
          href=${documentationUrl(this.hass, "/docs/automation/trigger/")}
          target="_blank"
          rel="noreferrer"
        >
          <ha-icon-button
            .path=${mdiHelpCircle}
            .label=${this.hass.localize(
              "ui.panel.config.automation.editor.triggers.learn_more"
            )}
          ></ha-icon-button>
        </a>
      </div>

      <ha-automation-trigger
        .triggers=${this.config.trigger}
        @value-changed=${this._triggerChanged}
        .hass=${this.hass}
      ></ha-automation-trigger>

      <div class="header">
        <div class="name">
          ${this.hass.localize(
            "ui.panel.config.automation.editor.conditions.header"
          )}
        </div>
        <a
          href=${documentationUrl(this.hass, "/docs/automation/condition/")}
          target="_blank"
          rel="noreferrer"
        >
          <ha-icon-button
            .path=${mdiHelpCircle}
            .label=${this.hass.localize(
              "ui.panel.config.automation.editor.conditions.learn_more"
            )}
          ></ha-icon-button>
        </a>
      </div>

      <ha-automation-condition
        .conditions=${this.config.condition || []}
        @value-changed=${this._conditionChanged}
        .hass=${this.hass}
      ></ha-automation-condition>

      <div class="header">
        <div class="name">
          ${this.hass.localize(
            "ui.panel.config.automation.editor.actions.header"
          )}
        </div>
        <a
          href=${documentationUrl(this.hass, "/docs/automation/action/")}
          target="_blank"
          rel="noreferrer"
        >
          <ha-icon-button
            .path=${mdiHelpCircle}
            .label=${this.hass.localize(
              "ui.panel.config.automation.editor.actions.learn_more"
            )}
          ></ha-icon-button>
        </a>
      </div>

      <ha-automation-action
        .actions=${this.config.action}
        @value-changed=${this._actionChanged}
        .hass=${this.hass}
        .narrow=${this.narrow}
      ></ha-automation-action>
    `;
  }

  protected willUpdate(changedProps: PropertyValues): void {
    super.willUpdate(changedProps);
    if (
      !this._showDescription &&
      changedProps.has("config") &&
      this.config.description
    ) {
      this._showDescription = true;
    }
  }

  private _runActions(ev: Event) {
    triggerAutomationActions(this.hass, (ev.target as any).stateObj.entity_id);
  }

  private _valueChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const target = ev.target as any;
    const name = target.name;
    if (!name) {
      return;
    }
    let newVal = target.value;
    if (target.type === "number") {
      newVal = Number(newVal);
    }
    if ((this.config![name] || "") === newVal) {
      return;
    }
    fireEvent(this, "value-changed", {
      value: { ...this.config!, [name]: newVal },
    });
  }

  private _modeChanged(ev) {
    const mode = ev.target.value;

    if (
      mode === this.config!.mode ||
      (!this.config!.mode && mode === MODES[0])
    ) {
      return;
    }
    const value = {
      ...this.config!,
      mode,
    };

    if (!isMaxMode(mode)) {
      delete value.max;
    }

    fireEvent(this, "value-changed", {
      value,
    });
  }

  private _triggerChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    fireEvent(this, "value-changed", {
      value: { ...this.config!, trigger: ev.detail.value as Trigger[] },
    });
  }

  private _conditionChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    fireEvent(this, "value-changed", {
      value: {
        ...this.config!,
        condition: ev.detail.value as Condition[],
      },
    });
  }

  private _actionChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    fireEvent(this, "value-changed", {
      value: { ...this.config!, action: ev.detail.value as Action[] },
    });
  }

  private _addDescription() {
    this._showDescription = true;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        :host {
          display: block;
        }
        ha-card {
          overflow: hidden;
        }
        .link-button-row {
          padding: 14px;
        }
        ha-textarea,
        ha-textfield {
          display: block;
        }

        p {
          margin-bottom: 0;
        }
        ha-entity-toggle {
          margin-right: 8px;
        }
        ha-select,
        .max {
          margin-top: 16px;
          width: 200px;
        }
        .header {
          display: flex;
          margin: 16px 0;
          align-items: center;
        }
        .header .name {
          font-size: 20px;
          font-weight: 400;
          flex: 1;
        }
        .header a {
          color: var(--secondary-text-color);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "manual-automation-editor": HaManualAutomationEditor;
  }
}
