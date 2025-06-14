/**
 * This file was auto-generated by Fern from our API Definition.
 */

import * as serializers from "../index";
import * as Scrapybara from "../../api/index";
import * as core from "../../core";

export const DeleteBrowserAuthResponse: core.serialization.ObjectSchema<
    serializers.DeleteBrowserAuthResponse.Raw,
    Scrapybara.DeleteBrowserAuthResponse
> = core.serialization.object({
    status: core.serialization.string(),
    authStateId: core.serialization.property("auth_state_id", core.serialization.string()),
});

export declare namespace DeleteBrowserAuthResponse {
    export interface Raw {
        status: string;
        auth_state_id: string;
    }
}
