import { betterAuth } from "better-auth";
import { remultAdapter } from "@nerdfolio/remult-better-auth";
import type { SqlDatabase } from "remult";

// Generated auth entities (run: bun apps/gateway/src/_gen-schema.ts)
import { User, Session, Account, Verification } from "./auth-schema.js";

// Lazy data provider set from api.ts at startup
let _dataProvider: SqlDatabase | undefined;

export function setAuthDataProvider(dp: SqlDatabase) {
	_dataProvider = dp;
}

export const auth = betterAuth({
	database: remultAdapter({
		authEntities: {
			user: User as never,
			session: Session as never,
			account: Account as never,
			verification: Verification as never,
		},
		usePlural: false,
		get dataProvider() {
			return _dataProvider;
		},
	}),
	emailAndPassword: {
		enabled: true,
		autoSignIn: true,
	},
	baseURL: process.env["BETTER_AUTH_URL"] || "http://localhost:3001",
	secret: process.env["BETTER_AUTH_SECRET"],
	trustedOrigins: (process.env["AUTH_TRUSTED_ORIGINS"] || "http://localhost:5173")
		.split(",")
		.map((s) => s.trim())
		.filter(Boolean),
	advanced: {
		cookiePrefix: "stratum",
		defaultCookieAttributes: {
			sameSite: "lax",
			secure: process.env["NODE_ENV"] === "production",
		},
	},
});
