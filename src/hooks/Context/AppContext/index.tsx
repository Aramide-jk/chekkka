"use client";

import {
	createContext,
	type ReactElement,
	type ReactNode,
	useCallback,
	useEffect,
	useState,
} from "react";
import { api, type IEnv } from "@/constants";
import type { ISessionUser } from "@/types";

interface IAppContextValue {
	env: IEnv;
	isBrowser: boolean;
	isUserLoggedIn: boolean;
	user: ISessionUser | null;
	setUser: (user: ISessionUser | null) => void;
	refreshSession: () => Promise<void>;
	logout: () => Promise<boolean>;
}

const noop = async () => {};

export const AppContextProvider = createContext<IAppContextValue>({
	env: {} as IEnv,
	isBrowser: false,
	isUserLoggedIn: false,
	user: null,
	setUser: () => {},
	refreshSession: noop,
	logout: async () => false,
});

interface IProps {
	children: ReactNode;
	env: IEnv;
	initialUser: ISessionUser | null;
}

export default function AppContext({
	children,
	env,
	initialUser,
}: IProps): ReactElement {
	const [isBrowser, setIsBrowser] = useState(false);
	const [user, setUser] = useState<ISessionUser | null>(initialUser);

	useEffect(() => {
		setIsBrowser(true);
	}, []);

	useEffect(() => {
		setUser(initialUser);
	}, [initialUser]);

	const refreshSession = useCallback(async () => {
		try {
			const res = await api().get("/api/auth/session");
			if (res.status === 200 && res.data?.data?.user) {
				setUser(res.data.data.user as ISessionUser);
			} else {
				setUser(null);
			}
		} catch {
			setUser(null);
		}
	}, []);

	const logout = useCallback(async () => {
		try {
			await api().post("/api/auth/logout");
			setUser(null);
			return true;
		} catch {
			return false;
		}
	}, []);

	return (
		<AppContextProvider.Provider
			value={{
				env,
				isBrowser,
				isUserLoggedIn: !!user,
				user,
				setUser,
				refreshSession,
				logout,
			}}
		>
			{children}
		</AppContextProvider.Provider>
	);
}
