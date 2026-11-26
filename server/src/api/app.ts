import { clerkPlugin } from "@clerk/fastify";
import Fastify from "fastify";
import type { AdventRepository } from "../core/repositories/advent.repository.js";
import type { UserService } from "../core/services/user.service.js";
import { healthRoutes } from "./routes/health.route.js";
import { userRoutes } from "./routes/user.route.js";
import { adventRoutes } from "./routes/advent.route.js";
import { registerAuthHook } from "./hooks/auth.hook.js";

interface AppDependencies {
	clerk: { publishableKey: string; secretKey: string; jwtKey?: string };
	userService: Pick<UserService, "getCurrentUser">;
	adventRepository: AdventRepository;
	close: () => Promise<void>;
}

export function buildApp(dependencies: AppDependencies) {
	const app = Fastify({
		logger: { redact: ["req.headers.authorization", "req.headers.cookie"] },
	});

	app.addHook("onClose", dependencies.close);

	app.register(clerkPlugin, {
		...dependencies.clerk,
		hookName: "onRequest",
	});

	app.after(() => {
		registerAuthHook(app, dependencies.userService);
		app.register(healthRoutes);
		app.register(userRoutes);
		app.register(adventRoutes, {
			adventRepository: dependencies.adventRepository,
		});
	});

	return app;
}
