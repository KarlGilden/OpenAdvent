import { getAuth } from "@clerk/fastify";
import type { FastifyInstance } from "fastify";
import type { UserService } from "../../core/services/user.service.js";
import type { UserProfile } from "../../core/repositories/user.repository.js";
import { ApiError } from "../api-error.js";

declare module "fastify" {
	interface FastifyRequest {
		CurrentUserId: string | null;
		currentUserProfile: UserProfile | null;
	}

	interface FastifyContextConfig {
		public?: boolean;
	}
}

export function registerAuthHook(
	app: FastifyInstance,
	userService: Pick<UserService, "getCurrentUser">,
) {
	app.decorateRequest("currentUserId", null);

	app.addHook("onRequest", async (request, reply) => {
		if (request.is404) return;
		const isPublic = request.routeOptions.config.public;
		if (!isPublic) reply.header("Cache-Control", "no-store");

		const auth = getAuth(request, { acceptsToken: "session_token" });
		if (!auth.isAuthenticated || !auth.userId) {
			if (isPublic) return;
			throw new ApiError(401, "UNAUTHORIZED", "Authentication required");
		}

		try {
			const { id, name, email } = await userService.getCurrentUser(auth.userId);
			request.CurrentUserId = id;
			request.currentUserProfile = { id, name, email };
		} catch (cause) {
			throw new ApiError(500, "INTERNAL_SERVER_ERROR", "Unable to load current user", { cause });
		}
	});
}
