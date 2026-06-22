import api from "./api";

export default async function fetcher<T>(url: string): Promise<T> {
	const response = await api().get(url);
	return response.data as T;
}
