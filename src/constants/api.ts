import axios, { type AxiosRequestConfig } from "axios";

const axiosClient = axios.create({
	withCredentials: true,
});

axiosClient.interceptors.response.use(
	(response) => response,
	(error) => {
		if (typeof window !== "undefined" && error?.response?.status === 401) {
			const method = String(error.config?.method ?? "get").toLowerCase();
			const url = String(error.config?.url ?? "");
			const isSessionProbe =
				url.includes("/api/auth/session") ||
				url.includes("/api/users/me");
			// Auto-redirect only on user-initiated mutations. Background GETs
			// should fail quietly so pages can render their empty/skeleton state.
			if (
				method !== "get" &&
				!isSessionProbe &&
				window.location.pathname !== "/login"
			) {
				window.location.href = "/login";
			}
		}
		return Promise.reject(error);
	},
);

const api = () => {
	return {
		get: async (url: string, options?: AxiosRequestConfig) => {
			return await axiosClient.get(url, options);
		},
		post: async (
			url: string,
			data?: unknown,
			options?: AxiosRequestConfig,
		) => {
			return await axiosClient.post(url, data, options);
		},
		patch: async (
			url: string,
			data?: unknown,
			options?: AxiosRequestConfig,
		) => {
			return await axiosClient.patch(url, data, options);
		},
		delete: async (url: string, options?: AxiosRequestConfig) => {
			return await axiosClient.delete(url, options);
		},
	};
};

export default api;
