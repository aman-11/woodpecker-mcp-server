import { WoodpeckerForgesService } from "./woodpeckerForges.js";
import { logger } from "mcp-framework";

/**
 * Service registry for dependency injection
 */
class ServiceRegistry {
    private static instance: ServiceRegistry;
    private services: Map<string, any> = new Map();
    private _initialized: boolean = false;

    private constructor() {}

    public static getInstance(): ServiceRegistry {
        if (!ServiceRegistry.instance) {
            ServiceRegistry.instance = new ServiceRegistry();
        }
        return ServiceRegistry.instance;
    }

    /**
     * Register a service in the registry
     */
    public register<T>(token: string, service: T): void {
        this.services.set(token, service);
    }

    /**
     * Get a service from the registry
     */
    public get<T>(token: string): T {
        const entry = this.services.get(token);
        if (!entry) {
            throw new Error(`Service ${token} not found in registry`);
        }

        // If it's a factory, instantiate it now and replace with instance
        if (entry.isFactory) {
            const instance = entry.factory();
            this.services.set(token, instance); // Replace factory with instance
            return instance;
        }

        return entry;
    }

    /**
     * Check if a service exists in the registry
     */
    public has(token: string): boolean {
        return this.services.has(token);
    }

    /**
     * Initialize all services
     */
    public async initialize(): Promise<void> {
        if (this._initialized) {
            logger.info("ServiceRegistry already initialized");
            return;
        }

        try {
            logger.info("Initializing ServiceRegistry...");

            // Services are now auto-registered via @Injectable() decorator
            // No manual registration needed here
            const registeredServices = this.getRegisteredTokens();
            logger.info(`Auto-registered services: ${registeredServices.join(', ')}`);

            this._initialized = true;
            logger.info("ServiceRegistry initialized successfully");
        } catch (error) {
            logger.error(`Failed to initialize ServiceRegistry: ${error}`);
            throw error;
        }
    }

    /**
     * Shutdown all services
     */
    public async shutdown(): Promise<void> {
        if (!this._initialized) {
            return;
        }

        try {
            logger.info("Shutting down ServiceRegistry...");

            // Cleanup services that support it
            const woodpeckerService = this.services.get('WoodpeckerForgesService') as WoodpeckerForgesService;
            if (woodpeckerService?.clearCache) {
                woodpeckerService.clearCache();
            }

            this.services.clear();
            this._initialized = false;
            logger.info("ServiceRegistry shut down successfully");
        } catch (error) {
            logger.error(`Failed to shut down ServiceRegistry: ${error}`);
        }
    }

    public get isInitialized(): boolean {
        return this._initialized;
    }

    /**
     * Register a service factory for lazy instantiation
     */
    public registerFactory<T>(token: string, factory: () => T): void {
        if (!this.services.has(token)) {
            // Store factory function, will be called when service is first requested
            this.services.set(token, { isFactory: true, factory });
        }
    }

    /**
     * Get all registered service tokens
     */
    public getRegisteredTokens(): string[] {
        return Array.from(this.services.keys());
    }
}

/**
 * Dependency injection decorator for services - Auto-registers services
 */
export function Injectable(token?: string) {
    return function <T extends { new (...args: any[]): {} }>(constructor: T) {
        // Auto-generate token from class name if not provided
        const serviceToken = token || constructor.name;

        // Get registry instance
        const registry = ServiceRegistry.getInstance();

        // Register the service factory automatically when decorator is applied
        const serviceFactory = () => {
            try {
                return new constructor();
            } catch (error) {
                throw new Error(`Failed to create instance of ${serviceToken}: ${error}`);
            }
        };

        // Auto-register with lazy instantiation
        registry.registerFactory(serviceToken, serviceFactory);

        // Log registration for debugging
        return constructor;
    };
}

/**
 * Get service from registry for constructor injection (with lazy loading)
 */
export function inject<T>(token: string): T {
    const registry = ServiceRegistry.getInstance();

    // Return a proxy that lazily resolves the service when accessed
    return new Proxy({}, {
        get(target, prop) {
            // Lazy resolve the actual service instance
            if (!registry.has(token)) {
                throw new Error(`Service ${token} not found. Make sure ServiceManager is initialized and service is registered with @Injectable.`);
            }

            const service = registry.get<T>(token);

            // Forward property access to the actual service
            const value = (service as any)[prop];
            if (typeof value === 'function') {
                return value.bind(service);
            }
            return value;
        }
    }) as T;
}

/**
 * Service manager that handles the registry lifecycle
 */
class ServiceManager {
    private static instance: ServiceManager;
    private registry = ServiceRegistry.getInstance();

    private constructor() {}

    public static getInstance(): ServiceManager {
        if (!ServiceManager.instance) {
            ServiceManager.instance = new ServiceManager();
        }
        return ServiceManager.instance;
    }

    public async initialize(): Promise<void> {
        await this.registry.initialize();
    }

    public async shutdown(): Promise<void> {
        await this.registry.shutdown();
    }

    public get isInitialized(): boolean {
        return this.registry.isInitialized;
    }

    public getHealthStatus(): { [key: string]: boolean } {
        return {
            serviceManager: this.registry.isInitialized,
            woodpeckerForges: this.registry.get('WoodpeckerForgesService') !== null,
        };
    }
}

// Export singleton instance getter
export const getServiceManager = (): ServiceManager => ServiceManager.getInstance();

// Export for direct access
export { ServiceManager, ServiceRegistry };
