/**
 * This file was auto-generated by Fern from our API Definition.
 */

import * as environments from "../../../../environments";
import * as core from "../../../../core";
import * as Scrapybara from "../../../index";
import * as serializers from "../../../../serialization/index";
import urlJoin from "url-join";
import * as errors from "../../../../errors/index";

export declare namespace Code {
    export interface Options {
        environment?: core.Supplier<environments.ScrapybaraEnvironment | string>;
        apiKey?: core.Supplier<string>;
    }

    export interface RequestOptions {
        /** The maximum time to wait for a response in seconds. */
        timeoutInSeconds?: number;
        /** The number of times to retry the request. Defaults to 2. */
        maxRetries?: number;
        /** A hook to abort the request. */
        abortSignal?: AbortSignal;
        /** Additional headers to include in the request. */
        headers?: Record<string, string>;
    }
}

export class Code {
    constructor(protected readonly _options: Code.Options = {}) {}

    /**
     * @param {string} instanceId
     * @param {Scrapybara.CodeExecuteRequest} request
     * @param {Code.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link Scrapybara.UnprocessableEntityError}
     *
     * @example
     *     await client.code.execute("instance_id", {
     *         code: "code"
     *     })
     */
    public async execute(
        instanceId: string,
        request: Scrapybara.CodeExecuteRequest,
        requestOptions?: Code.RequestOptions,
    ): Promise<unknown> {
        const _response = await core.fetcher({
            url: urlJoin(
                (await core.Supplier.get(this._options.environment)) ?? environments.ScrapybaraEnvironment.Production,
                `instance/${encodeURIComponent(instanceId)}/code/execute`,
            ),
            method: "POST",
            headers: {
                "X-Fern-Language": "JavaScript",
                "X-Fern-SDK-Name": "scrapybara",
                "X-Fern-SDK-Version": "2.6.0-beta.5",
                "User-Agent": "scrapybara/2.6.0-beta.5",
                "X-Fern-Runtime": core.RUNTIME.type,
                "X-Fern-Runtime-Version": core.RUNTIME.version,
                ...(await this._getCustomAuthorizationHeaders()),
                ...requestOptions?.headers,
            },
            contentType: "application/json",
            requestType: "json",
            body: serializers.CodeExecuteRequest.jsonOrThrow(request, { unrecognizedObjectKeys: "strip" }),
            timeoutMs: requestOptions?.timeoutInSeconds != null ? requestOptions.timeoutInSeconds * 1000 : 600000,
            maxRetries: requestOptions?.maxRetries,
            abortSignal: requestOptions?.abortSignal,
        });
        if (_response.ok) {
            return _response.body;
        }

        if (_response.error.reason === "status-code") {
            switch (_response.error.statusCode) {
                case 422:
                    throw new Scrapybara.UnprocessableEntityError(
                        serializers.HttpValidationError.parseOrThrow(_response.error.body, {
                            unrecognizedObjectKeys: "passthrough",
                            allowUnrecognizedUnionMembers: true,
                            allowUnrecognizedEnumValues: true,
                            breadcrumbsPrefix: ["response"],
                        }),
                    );
                default:
                    throw new errors.ScrapybaraError({
                        statusCode: _response.error.statusCode,
                        body: _response.error.body,
                    });
            }
        }

        switch (_response.error.reason) {
            case "non-json":
                throw new errors.ScrapybaraError({
                    statusCode: _response.error.statusCode,
                    body: _response.error.rawBody,
                });
            case "timeout":
                throw new errors.ScrapybaraTimeoutError(
                    "Timeout exceeded when calling POST /instance/{instance_id}/code/execute.",
                );
            case "unknown":
                throw new errors.ScrapybaraError({
                    message: _response.error.errorMessage,
                });
        }
    }

    protected async _getCustomAuthorizationHeaders() {
        const apiKeyValue = (await core.Supplier.get(this._options.apiKey)) ?? process?.env["SCRAPYBARA_API_KEY"];
        return { "x-api-key": apiKeyValue };
    }
}
