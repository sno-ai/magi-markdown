export function isValidUrl(url: string): boolean {
	return /^(http|https):\/\/[^ " ]+$/.test(url);
} 