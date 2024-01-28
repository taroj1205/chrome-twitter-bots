const path = require("path");
const CopyPlugin = require("copy-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

module.exports = {
	mode: "production",
	entry: {
		background: path.resolve(__dirname, "..", "src", "background.ts"),
		content: path.resolve(__dirname, "..", "src", "content.ts"),
		option: path.resolve(__dirname, "..", "src", "option.ts"),
		utils: path.resolve(__dirname, "..", "src", "utils.ts"),
		styles: path.resolve(__dirname, "..", "src", "styles.css"),
		popup: path.resolve(__dirname, "..", "src", "popup.ts"),
	},
	output: {
		path: path.join(__dirname, "../dist"),
		filename: "[name].js",
	},
	resolve: {
		extensions: [".ts", ".js"],
	},
	module: {
		rules: [
			{
				test: /\.tsx?$/,
				loader: "ts-loader",
				exclude: /node_modules/,
			},
			{
				test: /\.css$/,
				use: [MiniCssExtractPlugin.loader, "css-loader", "postcss-loader"],
			},
		],
	},
	plugins: [
		new MiniCssExtractPlugin(),
		new CopyPlugin({
			patterns: [{ from: ".", to: ".", context: "public" }],
		}),
	],
};
