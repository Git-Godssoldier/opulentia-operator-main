/**
 * This file was auto-generated by Fern from our API Definition.
 */

import * as serializers from "../../index";
import * as Scrapybara from "../../../api/index";
import * as core from "../../../core";
import { DeploymentConfigInstanceType } from "../../types/DeploymentConfigInstanceType";

export const DeploymentConfig: core.serialization.Schema<
    serializers.DeploymentConfig.Raw,
    Scrapybara.DeploymentConfig
> = core.serialization.object({
    instanceType: core.serialization.property("instance_type", DeploymentConfigInstanceType.optional()),
    timeoutHours: core.serialization.property("timeout_hours", core.serialization.number().optional()),
    blockedDomains: core.serialization.property(
        "blocked_domains",
        core.serialization.list(core.serialization.string()).optional(),
    ),
    resolution: core.serialization.list(core.serialization.number()).optional(),
    backend: core.serialization.string().optional(),
    snapshotId: core.serialization.property("snapshot_id", core.serialization.string().optional()),
});

export declare namespace DeploymentConfig {
    export interface Raw {
        instance_type?: DeploymentConfigInstanceType.Raw | null;
        timeout_hours?: number | null;
        blocked_domains?: string[] | null;
        resolution?: number[] | null;
        backend?: string | null;
        snapshot_id?: string | null;
    }
}
