/**
 * This file was auto-generated by Fern from our API Definition.
 */

import * as serializers from "../index";
import * as Scrapybara from "../../api/index";
import * as core from "../../core";

export const Button: core.serialization.Schema<serializers.Button.Raw, Scrapybara.Button> = core.serialization.enum_([
    "left",
    "right",
    "middle",
    "back",
    "forward",
]);

export declare namespace Button {
    export type Raw = "left" | "right" | "middle" | "back" | "forward";
}
