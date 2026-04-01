interface CockpitSpawnOptions {
    superuser?: "try" | "require";
    err?: "out" | "ignore" | "message";
    environ?: string[];
}

interface CockpitSpawnResult extends Promise<string> {
    stream(callback: (data: string) => void): CockpitSpawnResult;
    fail(callback: (error: Error) => void): CockpitSpawnResult;
}

declare const cockpit: {
    spawn(args: string[], options?: CockpitSpawnOptions): CockpitSpawnResult;
    gettext(text: string): string;
};
