import rss from "@astrojs/rss";
import { getSortedPosts } from "@utils/content-utils";
import { url } from "@utils/url-utils";
import type { APIContext } from "astro";
import MarkdownIt from "markdown-it";
import sanitizeHtml from "sanitize-html";
import { siteConfig } from "@/config";

const parser = new MarkdownIt();

function stripInvalidXmlChars(str: string): string {
	return str.replace(
		// biome-ignore lint/suspicious/noControlCharactersInRegex: https://www.w3.org/TR/xml/#charsets
		/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F\uFDD0-\uFDEF\uFFFE\uFFFF]/g,
		"",
	);
}

export async function GET(context: APIContext) {
	const blog = await getSortedPosts();

	return rss({
		title: siteConfig.title,
		description: siteConfig.subtitle || "No description",
		site: context.site ?? "https://fuwari.vercel.app",
		items: blog.map((post) => {
			const content =
				typeof post.body === "string" ? post.body : String(post.body || "");
			const cleanedContent = stripInvalidXmlChars(content);
			const siteBase = String(
				context.site ?? "https://fuwari.vercel.app",
			).replace(/\/$/, "");
			let enclosure: { url: string; length: number; type: string } | undefined;
			const image = post.data?.image;
			if (image) {
				let imageUrl = String(image);
				if (/^https?:\/\//i.test(imageUrl)) {
					// keep as-is
				} else if (imageUrl.startsWith("/")) {
					imageUrl = `${siteBase}${imageUrl}`;
				} else {
					const cleaned = imageUrl.replace(/^\.\/?/, "");
					imageUrl = `${siteBase}/posts/${post.slug}/${cleaned}`;
				}

				const ext = (imageUrl.split(".").pop() || "").toLowerCase();
				let mime = "image/*";
				switch (ext) {
					case "png":
						mime = "image/png";
						break;
					case "jpg":
					case "jpeg":
						mime = "image/jpeg";
						break;
					case "webp":
						mime = "image/webp";
						break;
					case "gif":
						mime = "image/gif";
						break;
					case "svg":
						mime = "image/svg+xml";
						break;
				}

				enclosure = { url: imageUrl, length: 0, type: mime };
			}

			return {
				title: post.data.title,
				pubDate: post.data.published,
				description: post.data.description || "",
				link: url(`/posts/${post.slug}/`),
				content: sanitizeHtml(parser.render(cleanedContent), {
					allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img"]),
				}),
				...(enclosure ? { enclosure } : {}),
			};
		}),
		customData: `<language>${siteConfig.lang}</language>`,
	});
}
