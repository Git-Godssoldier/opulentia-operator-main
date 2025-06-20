/**
 * This file was auto-generated by Fern from our API Definition.
 */

import * as serializers from "../index";
import * as Scrapybara from "../../api/index";
import * as core from "../../core";

export const InstanceScreenshotResponse: core.serialization.ObjectSchema<
    serializers.InstanceScreenshotResponse.Raw,
    Scrapybara.InstanceScreenshotResponse
> = core.serialization.object({
    base64Image: core.serialization.property("base64_image", core.serialization.string()),
});

export declare namespace InstanceScreenshotResponse {
    export interface Raw {
        base64_image: string;
    }
}
