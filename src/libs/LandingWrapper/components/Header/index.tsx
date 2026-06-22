"use client";

import Link from "next/link";
import { useContext } from "react";
import styled from "styled-components";
import { Avatar, Button, Logo, Pill } from "@/components";
import { AppContextProvider } from "@/hooks";
import type { UserRole } from "@/types";

const Bar = styled.header`
    position: sticky;
    top: 0;
    z-index: 50;
    backdrop-filter: blur(20px);
    background: rgba(14, 13, 10, 0.72);
    border-bottom: 1px solid var(--hairline);

    [data-theme="light"] & {
        background: rgba(248, 245, 236, 0.82);
    }
`;

const Inner = styled.div`
    max-width: 1280px;
    margin: 0 auto;
    padding: 18px 32px;
    display: flex;
    align-items: center;
    justify-content: space-between;
`;

const NavList = styled.nav`
    display: flex;
    gap: 28px;
    font-size: 13px;
    color: var(--ink-soft);

    a:hover { color: var(--gold-bright); }

    @media (max-width: 900px) {
        display: none;
    }
`;

const CTAs = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
`;

const HideOnMobile = styled.span`
    @media (max-width: 900px) {
        display: none;
    }
`;

const ROLE_HOME: Record<UserRole, string> = {
	buyer: "/dashboard",
	inspector: "/inspector/dashboard",
	consultant: "/consultant/chats",
	admin: "/admin",
	manager: "/admin",
};

const ROLE_LABEL: Record<UserRole, string> = {
	buyer: "Buyer",
	inspector: "Inspector",
	consultant: "Consultant",
	admin: "Admin",
	manager: "Manager",
};

export default function Header() {
	const { user, isUserLoggedIn } = useContext(AppContextProvider);
	const dashboardHref = user ? ROLE_HOME[user.role] : "/dashboard";
	const showBookButton = !isUserLoggedIn || user?.role === "buyer";

	return (
		<Bar>
			<Inner>
				<Logo />
				<NavList>
					<a href="#how">How it works</a>
					<a href="#plans">Plans</a>
					<a href="#trust">Trust</a>
					<a href="#brokers">Brokers</a>
					<a href="#inspectors">Become an inspector</a>
				</NavList>
				<CTAs>
					{isUserLoggedIn && user ? (
						<>
							<HideOnMobile>
								<Pill tone="ghost">
									{ROLE_LABEL[user.role]}
								</Pill>
							</HideOnMobile>
							<HideOnMobile>
								<Link href={dashboardHref}>
									<Button variant="ghost" size="sm">
										Dashboard
									</Button>
								</Link>
							</HideOnMobile>
							<Link
								href={dashboardHref}
								aria-label={`Open ${user.fullName}'s dashboard`}
							>
								<Avatar name={user.fullName} size={36} />
							</Link>
						</>
					) : (
						<HideOnMobile>
							<Link href="/login">
								<Button variant="ghost" size="sm">
									Sign in
								</Button>
							</Link>
						</HideOnMobile>
					)}
					{showBookButton && (
						<Link href="/book">
							<Button variant="primary" size="sm">
								Book inspection
							</Button>
						</Link>
					)}
				</CTAs>
			</Inner>
		</Bar>
	);
}
