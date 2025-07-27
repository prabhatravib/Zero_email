import { DurableObject } from "cloudflare:workers";

export class ZeroMCP extends DurableObject {
    constructor(state: DurableObjectState, env: any) {
        super(state, env);
    }
} 