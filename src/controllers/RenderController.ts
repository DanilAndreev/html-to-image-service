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

import Controller from "../core/webserver/Controller";
import {Context} from "koa";
import * as nodeHtmlToImage from "node-html-to-image";
import printValidationMiddleware from "../ajv/printValidation";


const style: string = `
@page {
  size: A4;
  margin: 0;
}
@media print {
  html, body {
    width: 210mm;
    height: 297mm;
  }
}
`;

@Controller.HTTPController("/render")
class PulseController extends Controller {
    @Controller.Route("GET", "/print")
    @Controller.RouteValidation(printValidationMiddleware)
    public async render(ctx: Context): Promise<void> {
        const text: string = ctx.request.body?.text || "";

        //TODO: fix library and update.

        /* eslint-disable @typescript-eslint/ban-ts-comment */
        // @ts-ignore
        const image = await nodeHtmlToImage({
            html: text,
            beforeScreenshot: async page => {
                await page.emulateMedia("print");
                await page.addStyleTag({
                    content: style,
                });
            },
            puppeteerArgs: {
                args: ["--no-sandbox"],
            },
        });

        ctx.res.writeHead(200, {"Content-Type": "image/png"});
        ctx.res.end(image, "binary");
    }
}

export default PulseController;
