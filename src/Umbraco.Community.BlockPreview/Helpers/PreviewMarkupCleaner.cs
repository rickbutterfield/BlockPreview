using HtmlAgilityPack;

namespace Umbraco.Community.BlockPreview.Helpers
{
    /// <summary>
    /// Prepares rendered block markup for display inside the back office preview.
    /// </summary>
    internal static class PreviewMarkupCleaner
    {
        /// <summary>
        /// Elements that are removed entirely because they have no place in a preview.
        /// </summary>
        private static readonly string[] RemovedElements = ["script", "base", "meta"];

        /// <summary>
        /// Attributes that can hold a URL the browser may navigate to or load.
        /// </summary>
        private static readonly string[] UrlAttributes = ["href", "xlink:href", "src", "action", "formaction", "data"];

        /// <summary>
        /// SVG animation elements that can change another attribute's value.
        /// </summary>
        private static readonly string[] SvgAnimationElements = ["set", "animate", "animatetransform", "animatemotion"];

        /// <summary>
        /// Cleans rendered block markup so it is inert when shown in the back office.
        /// </summary>
        /// <param name="markup">The rendered markup.</param>
        /// <returns>The cleaned markup.</returns>
        public static string Clean(string markup)
        {
            if (string.IsNullOrWhiteSpace(markup))
                return markup;

            var content = new HtmlDocument();
            content.LoadHtml(markup);

            RemoveActiveContent(content.DocumentNode);

            // make sure links are not clickable in the back office, because this will prevent editing
            var links = content.DocumentNode.SelectNodes("//a");

            if (links != null)
            {
                foreach (var link in links)
                {
                    link.SetAttributeValue("href", "javascript:;");
                    link.SetAttributeValue("data-block-preview-link", "true");
                }
            }

            // disable forms so they can't be submitted via tab
            var formElements = content.DocumentNode.SelectNodes("//input | //textarea | //select | //button");
            if (formElements != null)
            {
                foreach (var formElement in formElements)
                {
                    formElement.SetAttributeValue("disabled", "disabled");
                }
            }

            return content.DocumentNode.OuterHtml;
        }

        private static void RemoveActiveContent(HtmlNode root)
        {
            foreach (var node in root.Descendants().ToList())
            {
                if (node.NodeType != HtmlNodeType.Element)
                    continue;

                var name = node.Name.ToLowerInvariant();

                if (RemovedElements.Contains(name) || IsUnsafeSvgAnimation(node, name))
                {
                    node.Remove();
                    continue;
                }

                foreach (var attribute in node.Attributes.ToList())
                {
                    var attributeName = attribute.Name.ToLowerInvariant();

                    // Link targets are replaced in Clean, so leave them where they are.
                    if (name == "a" && attributeName == "href")
                        continue;

                    if (attributeName.StartsWith("on", StringComparison.Ordinal)
                        || attributeName == "srcdoc"
                        || (UrlAttributes.Contains(attributeName) && IsScriptUrl(attribute.DeEntitizeValue)))
                    {
                        attribute.Remove();
                    }
                }
            }
        }

        private static bool IsUnsafeSvgAnimation(HtmlNode node, string name)
        {
            if (!SvgAnimationElements.Contains(name))
                return false;

            var target = node.GetAttributeValue("attributename", string.Empty).Trim().ToLowerInvariant();
            return target.StartsWith("on", StringComparison.Ordinal) || target is "href" or "xlink:href";
        }

        private static bool IsScriptUrl(string? value)
        {
            if (string.IsNullOrEmpty(value))
                return false;

            // Browsers ignore whitespace and control characters inside the scheme, so strip them before comparing.
            var normalised = new string(value.Where(c => !char.IsWhiteSpace(c) && !char.IsControl(c)).ToArray()).ToLowerInvariant();

            return normalised.StartsWith("javascript:", StringComparison.Ordinal)
                || normalised.StartsWith("vbscript:", StringComparison.Ordinal)
                || normalised.StartsWith("data:text/html", StringComparison.Ordinal);
        }
    }
}
