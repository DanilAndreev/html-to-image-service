/*
 * MIT License
 *
 * Copyright (c) 2021 Danil Andreev
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 */

import * as Koa from "koa";
import {Context, Next} from "koa";
import * as Router from "koa-router";
import {Server} from "http";
import {Logger} from "../logger/Logger";
import HttpError from "../errors/HttpError";
import * as shutdown from "koa-graceful-shutdown";
import Destructable from "../interfaces/Destructable";
import Controller from "./Controller";
import * as BodyParser from "koa-bodyparser";


class WebServer extends Koa implements Destructable {
    protected readonly router: Router;
    public port: number;
    private session: Server | null;

    public constructor(config: WebServer.Config = {}) {
        super();
        this.session = null;
        this.router = new Router();
        this.port = config?.port || 22233;

        this.use(async (ctx: Context, next: Next) => await WebServer.httpErrorsMiddleware(ctx, next));
        this.use(BodyParser());

        const controllers = config.controllers || [];
        for (const controller of controllers) {
            this.router.use(controller.baseRoute, controller.routes(), controller.allowedMethods());
        }
        this.use(this.router.routes());
    }

    /**
     * httpErrorsMiddleware - middleware for handling HttpError.
     * @method
     * @param ctx - Koa HTTP context.
     * @param next - Next middleware.
     * @throws Error
     * @author Danil Andreev
     */
    public static async httpErrorsMiddleware(ctx: Context, next: Next): Promise<void> {
        try {
            await next();
        } catch (error) {
            if (error instanceof HttpError) {
                Logger?.debug(`Http Request error(${error.code}): ${error.message}`);
                ctx.status = error.code;
                ctx.body = error.getResponseMessage();
            } else {
                throw error;
            }
        }
    }

    /**
     * start - starts the server.
     * @method
     * @param port - Target port. If not defined - will be taken from env or config.
     * @author Danil Andreev
     */
    public async start(port?: number): Promise<WebServer> {
        await this.stopServer();
        const targetPort: number = port || this.port || 3030;
        Logger.info(`Web server started on port ${targetPort}.`);
        this.session = this.listen(targetPort);
        this.use(shutdown(this.session));
        return this;
    }

    protected stopServer(): Promise<WebServer> {
        return new Promise<WebServer>((resolve, reject) => {
            const session: Server | null = this.session;
            this.session = null;
            if (session) {
                session.close((error: Error) => {
                    if (error) reject(error);
                    resolve(this);
                });
            } else {
                resolve(this);
            }
        });
    }

    public async destruct(): Promise<void> {
        await this.stopServer();
    }
}

namespace WebServer {
    export interface Config {
        controllers?: Controller[];
        port?: number;
    }
}

export default WebServer;
