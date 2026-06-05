import { HttpTransport, InfoClient } from "@nktkas/hyperliquid";

const transport = new HttpTransport();
export const hlClient = new InfoClient({ transport });
