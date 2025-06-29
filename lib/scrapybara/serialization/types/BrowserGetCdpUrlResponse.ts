/**
 * This file was auto-generated by Fern from our API Definition.
 */

import * as serializers from "../index";
import * as Scrapybara from "../../api/index";
import * as core from "../../core";

export const BrowserGetCdpUrlResponse: core.serialization.ObjectSchema<
    serializers.BrowserGetCdpUrlResponse.Raw,
    Scrapybara.BrowserGetCdpUrlResponse
> = core.serialization.object({
    cdpUrl: core.serialization.property("cdp_url", core.serialization.string()),
});

export declare namespace BrowserGetCdpUrlResponse {
    export interface Raw {
        cdp_url: string;
    }
}
