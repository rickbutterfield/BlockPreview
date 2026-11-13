namespace Umbraco.Community.BlockPreview
{
    /// <summary>
    /// Constants used throughout the Block Preview package.
    /// </summary>
    public static partial class Constants
    {
        /// <summary>
        /// Default view locations for different block types.
        /// </summary>
        public static partial class DefaultViewLocations
        {
            /// <summary>
            /// Default view location for Block Grid components.
            /// </summary>
            public const string BlockGrid = "/Views/Partials/blockgrid/Components/{0}.cshtml";
            
            /// <summary>
            /// Default view location for Block List components.
            /// </summary>
            public const string BlockList = "/Views/Partials/blocklist/Components/{0}.cshtml";
            
            /// <summary>
            /// Default view location for Rich Text components.
            /// </summary>
            public const string RichText = "/Views/Partials/richtext/Components/{0}.cshtml";

            /// <summary>
            /// Default view location for Single Block components.
            /// </summary>
            public const string SingleBlock = "/Views/Partials/blocklist/Components/{0}.cshtml";
        }

        /// <summary>
        /// Configuration constants.
        /// </summary>
        public static partial class Configuration
        {
            /// <summary>
            /// The package name.
            /// </summary>
            public const string PackageName = "Umbraco.Community.BlockPreview";
            
            /// <summary>
            /// The app settings root key.
            /// </summary>
            public const string AppSettingsRoot = "BlockPreview";
            
            /// <summary>
            /// The API name.
            /// </summary>
            public const string ApiName = "block-preview";
            
            /// <summary>
            /// The API path.
            /// </summary>
            public const string ApiPath = "/block-preview/api";
            
            /// <summary>
            /// The App_Plugins root path.
            /// </summary>
            public const string AppPluginsRoot = $"App_Plugins/{PackageName}";
        }

        /// <summary>
        /// Error message templates.
        /// </summary>
        public static partial class ErrorMessages
        {
            /// <summary>
            /// Error message template for rendering errors.
            /// </summary>
            public const string RenderError = "<strong>Something went wrong rendering a preview.</strong><br/><pre>{0}</pre>";

            /// <summary>
            /// Error message for missing ModelsBuilder models.
            /// </summary>
            public const string ModelsBuilderError = "Strongly typed models must be generated and exist on disk for BlockPreview to work.";

            /// <summary>
            /// HTML template for error alerts.
            /// </summary>
            public const string ErrorTemplate = "<div class=\"preview-alert preview-alert-error\">{0}</div>";

            /// <summary>
            /// HTML template for warning alerts.
            /// </summary>
            public const string WarningTemplate = "<div class=\"preview-alert preview-alert-warning\">{0}</div>";

            /// <summary>
            /// Error message for missing generated models.
            /// </summary>
            public const string NoGeneratedModels = "Generated model(s) could not be found. Please try regenerating models and restarting the application.";

            /// <summary>
            /// Error message when ModelsBuilder is not configured to generate models.
            /// </summary>
            public const string ModelsNotConfigured = "BlockPreview requires strongly-typed models. Please configure ModelsBuilder with SourceCodeAuto or SourceCodeManual mode.";

            /// <summary>
            /// Error message for invalid block data.
            /// </summary>
            public const string InvalidBlockData = "The block data is invalid.";

            /// <summary>
            /// Error message for invalid content key.
            /// </summary>
            public const string InvalidContentKey = "The content key is invalid.";

            /// <summary>
            /// Error message for invalid content data.
            /// </summary>
            public const string InvalidContentData = "The content data is invalid.";

            /// <summary>
            /// Error message when the Library element behind an external block cannot be found.
            /// </summary>
            public const string ExternalElementNotFound = "The Library element used by this block could not be found.";

            /// <summary>
            /// Error message when the user may not browse the Library element behind an external block.
            /// </summary>
            public const string ExternalElementNotPermitted = "You do not have permission to preview the Library element used by this block.";

            /// <summary>
            /// Error message for invalid block instance.
            /// </summary>
            public const string InvalidBlockInstance = "The block instance is invalid.";

            /// <summary>
            /// Error message for invalid document type.
            /// </summary>
            public const string InvalidDocumentType = "The document type is invalid.";

            /// <summary>
            /// Error message for invalid property type.
            /// </summary>
            public const string InvalidPropertyType = "The property type is invalid.";

            /// <summary>
            /// Error message for invalid data type.
            /// </summary>
            public const string InvalidDataType = "The data type is invalid.";

            /// <summary>
            /// Error message for invalid block grid configuration.
            /// </summary>
            public const string InvalidBlockGridConfiguration = "The block grid configuration is invalid.";

            /// <summary>
            /// Error message for missing matching block grid configuration.
            /// </summary>
            public const string InvalidMatchingBlockGridConfiguration = "A matching block grid configuration could not be found";

            /// <summary>
            /// Error message template for view not found.
            /// </summary>
            public const string ViewNotFound = "The view <code>{0}.cshtml</code> could not be found. Searched the following locations: <pre>{1}</pre>";

            /// <summary>
            /// Logger error message template.
            /// </summary>
            public const string LoggerError = "Error rendering preview for block {0}";
        }

        /// <summary>
        /// Cache key templates.
        /// </summary>
        public static partial class CacheKeys
        {
            /// <summary>
            /// Cache key template for content.
            /// </summary>
            public const string Content = "BlockPreview_Content_{0}";
            
            /// <summary>
            /// Cache key for generated models.
            /// </summary>
            public const string GeneratedModels = "BlockPreview_GeneratedModels";
            
            /// <summary>
            /// Cache key template for content type.
            /// </summary>
            public const string ContentType = "BlockPreview_ContentType_{0}";
            
            /// <summary>
            /// Cache key template for data type.
            /// </summary>
            public const string DataType = "BlockPreview_DataType_{0}";

            /// <summary>
            /// Cache key for element type aliases used by the settings endpoint.
            /// Invalidated by <see cref="NotificationHandlers.ContentTypeSavedNotificationHandler"/> when any content type is saved.
            /// </summary>
            public const string ElementAliases = "BlockPreview_ElementAliases";
        }
    }
}