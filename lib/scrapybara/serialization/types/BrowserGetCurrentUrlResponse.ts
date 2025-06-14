/**
 * This file was auto-generated by Fern from our API Definition.
 */

import * as serializers from "../index";
import * as Scrapybara from "../../api/index";
import * as core from "../../core";

export const BrowserGetCurrentUrlResponse: core.serialization.ObjectSchema<
    serializers.BrowserGetCurrentUrlResponse.Raw,
    Scrapybara.BrowserGetCurrentUrlResponse
> = core.serialization.object({
    currentUrl: core.serialization.property("current_url", core.serialization.string()),
});

export declare namespace BrowserGetCurrentUrlResponse {
    export interface Raw {
        current_url: string;
    }
}
