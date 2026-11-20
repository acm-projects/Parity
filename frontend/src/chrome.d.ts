declare const chrome:
  | {
      identity?: {
        getRedirectURL(path?: string): string;
        launchWebAuthFlow(details: { url: string; interactive: boolean }, callback: (redirectUrl?: string) => void): void;
      };
      runtime?: { lastError?: { message?: string } };
      storage?: {
        local: {
          get(key: string): Promise<Record<string, unknown>>;
          set(items: Record<string, unknown>): Promise<void>;
        };
      };
      devtools?: {
        inspectedWindow: {
          eval(
            expression: string,
            callback: (result: unknown, exceptionInfo?: { isError?: boolean; isException?: boolean }) => void
          ): void;
        };
        network?: {
          onNavigated: {
            addListener(callback: (url: string) => void): void;
            removeListener(callback: (url: string) => void): void;
          };
        };
        panels: {
          elements: {
            onSelectionChanged: {
              addListener(callback: () => void): void;
              removeListener(callback: () => void): void;
            };
          };
        };
      };
    }
  | undefined;