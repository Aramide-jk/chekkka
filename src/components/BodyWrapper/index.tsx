"use client";

import { motion } from "motion/react";
import NextTopLoader from "nextjs-toploader";
import { Fragment, type ReactNode, useEffect, useState } from "react";
import { SWRConfig } from "swr";
import { type IEnv, verifyUserLogin } from "@/constants";
import { AppContext, ThemeContext } from "@/hooks";
import { GlobalStyle } from "@/styles";
import type { ISessionUser } from "@/types";
import Main from "./components/Main";

interface IProps {
	children: ReactNode;
	env: IEnv;
	cookieHeader: string;
}

export default function BodyWrapper({ children, env, cookieHeader }: IProps) {
	const [initialUser, setInitialUser] = useState<ISessionUser | null>(null);

	useEffect(() => {
		if (initialUser) return;

		(async () => {
			const result = await verifyUserLogin({ cookieHeader });
			setInitialUser(result);
		})();
	}, [initialUser, cookieHeader]);

	return (
		<Fragment>
			<GlobalStyle />
			<NextTopLoader color="#C9A961" shadow={false} showSpinner={false} />
			<motion.div
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				exit={{ opacity: 0 }}
				transition={{ duration: 0 }}
			>
				<SWRConfig
					value={{
						shouldRetryOnError: false,
						revalidateOnFocus: false,
						revalidateOnMount: false,
						revalidateOnReconnect: true,
						refreshWhenOffline: true,
						refreshWhenHidden: false,
					}}
				>
					<AppContext env={env} initialUser={initialUser}>
						<ThemeContext>
							<Main>{children}</Main>
						</ThemeContext>
					</AppContext>
				</SWRConfig>
			</motion.div>
		</Fragment>
	);
}
