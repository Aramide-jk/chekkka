"use client";

const ranges = [
	{ divider: 1e3, suffix: "K" },
	{ divider: 1e6, suffix: "M" },
	{ divider: 1e9, suffix: "B" },
];

const formatNumber = (input: number): string => {
	if (input === 0) return input.toString();
	if (input < 1) return input.toFixed(4);

	input = input.toString().length > 5 ? parseFloat(input.toFixed(5)) : input;

	if (input < 999) return input.toString();

	for (let index = ranges.length - 1; index >= 0; index--) {
		if (input > ranges[index].divider) {
			let quotient = input / ranges[index].divider;
			quotient =
				quotient < 10
					? Math.floor(quotient * 10) / 10
					: Math.floor(quotient);
			return quotient + ranges[index].suffix;
		}
	}

	return input.toString();
};

export default formatNumber;

/**
 * Naira formatter — `₦8,200,000`. Use this anywhere Chekka displays money.
 */
export function NAIRA(value: number): string {
	return `₦${value.toLocaleString("en-NG")}`;
}
