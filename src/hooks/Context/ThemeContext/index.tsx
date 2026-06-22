"use client";

import {
	createContext,
	type ReactElement,
	type ReactNode,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from "react";

export type Theme = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

interface IThemeContextValue {
	theme: Theme;
	resolvedTheme: ResolvedTheme;
	setTheme: (theme: Theme) => void;
}

const STORAGE_KEY = "chekka:theme";

export const ThemeContextProvider = createContext<IThemeContextValue>({
	theme: "dark",
	resolvedTheme: "dark",
	setTheme: () => {},
});

function readStoredTheme(): Theme {
	if (typeof window === "undefined") return "dark";
	const stored = window.localStorage.getItem(STORAGE_KEY);
	if (stored === "light" || stored === "dark" || stored === "system") {
		return stored;
	}
	return "dark";
}

function systemPreference(): ResolvedTheme {
	if (typeof window === "undefined") return "dark";
	return window.matchMedia?.("(prefers-color-scheme: dark)").matches
		? "dark"
		: "light";
}

export default function ThemeContext({
	children,
}: {
	children: ReactNode;
}): ReactElement {
	const [theme, setThemeState] = useState<Theme>("dark");
	const [systemValue, setSystemValue] = useState<ResolvedTheme>("dark");

	useEffect(() => {
		setThemeState(readStoredTheme());
		setSystemValue(systemPreference());

		const mq = window.matchMedia("(prefers-color-scheme: dark)");
		const handler = (e: MediaQueryListEvent) => {
			setSystemValue(e.matches ? "dark" : "light");
		};
		mq.addEventListener("change", handler);
		return () => mq.removeEventListener("change", handler);
	}, []);

	const resolvedTheme: ResolvedTheme = useMemo(() => {
		return theme === "system" ? systemValue : theme;
	}, [theme, systemValue]);

	useEffect(() => {
		if (typeof document === "undefined") return;
		document.documentElement.setAttribute("data-theme", resolvedTheme);
	}, [resolvedTheme]);

	const setTheme = useCallback((value: Theme) => {
		setThemeState(value);
		try {
			window.localStorage.setItem(STORAGE_KEY, value);
		} catch {
			// ignore quota / private mode
		}
	}, []);

	return (
		<ThemeContextProvider.Provider
			value={{ theme, resolvedTheme, setTheme }}
		>
			{children}
		</ThemeContextProvider.Provider>
	);
}
