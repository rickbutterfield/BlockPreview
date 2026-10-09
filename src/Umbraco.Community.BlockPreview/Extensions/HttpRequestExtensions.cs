using Microsoft.AspNetCore.Http;
using Umbraco.Community.BlockPreview.Controllers;

namespace Umbraco.Community.BlockPreview.Extensions
{
    /// <summary>
    /// Extension methods for HTTP requests.
    /// </summary>
    public static class HttpRequestExtensions
    {
        /// <summary>
        /// Determines whether the HTTP request is a Block Preview request.
        /// </summary>
        /// <param name="request">The HTTP request.</param>
        /// <returns>True if the request is a Block Preview request; otherwise, false.</returns>
        public static bool IsBlockPreviewRequest(this HttpRequest request)
        {
            var routeValues = request.RouteValues;

            if (!routeValues.TryGetValue("controller", out var controllerValue) ||
                !routeValues.TryGetValue("action", out var actionValue) ||
                controllerValue is not string controller ||
                actionValue is not string action)
            {
                return false;
            }

            string requestControllerName = controller + "Controller";

            bool requestControllerMatches = requestControllerName.Equals(nameof(BlockPreviewApiController));
            bool isBlockGridPreview = action.Equals(nameof(BlockPreviewApiController.PreviewGridBlock));
            bool isBlockListPreview = action.Equals(nameof(BlockPreviewApiController.PreviewListBlock));
            bool isRichTextPreview = action.Equals(nameof(BlockPreviewApiController.PreviewRichTextMarkup));
            bool isSingleBlockPreview = action.Equals(nameof(BlockPreviewApiController.PreviewSingleBlock));

            return requestControllerMatches && (isBlockGridPreview || isBlockListPreview || isRichTextPreview || isSingleBlockPreview);
        }
    }
}
