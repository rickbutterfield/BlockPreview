using Umbraco.Cms.Core.Cache;
using Umbraco.Cms.Core.DependencyInjection;
using Umbraco.Cms.Core.Events;
using Umbraco.Cms.Core.Models;
using Umbraco.Cms.Core.Notifications;
using Umbraco.Cms.Core.Services;
using Umbraco.Extensions;
using Microsoft.Extensions.DependencyInjection;

namespace Umbraco.Community.BlockPreview.NotificationHandlers
{
    /// <summary>
    /// Handles data type saved notifications to clear related caches.
    /// </summary>
    public class DataTypeSavedNotificationHandler : INotificationHandler<DataTypeSavedNotification>
    {
        private readonly IAppPolicyCache _runtimeCache;
        private readonly IContentTypeService? _contentTypeService;

        /// <summary>
        /// Initializes a new instance of the <see cref="DataTypeSavedNotificationHandler"/> class.
        /// </summary>
        /// <param name="appCaches">The application caches.</param>
        /// <param name="contentTypeService">The content type service.</param>
        public DataTypeSavedNotificationHandler(AppCaches appCaches, IContentTypeService contentTypeService)
        {
            _runtimeCache = appCaches.RuntimeCache;
            _contentTypeService = contentTypeService;
        }

        /// <summary>
        /// Handles the data type saved notification.
        /// </summary>
        /// <param name="notification">The notification.</param>
        public void Handle(DataTypeSavedNotification notification)
        {
            if (notification.SavedEntities == null || !notification.SavedEntities.Any())
                return;

            foreach (var savedDataType in notification.SavedEntities)
            {
                bool matchingEditor = savedDataType.EditorAlias.ContainsAny(new[] {
                    Cms.Core.Constants.PropertyEditors.Aliases.BlockGrid,
                    Cms.Core.Constants.PropertyEditors.Aliases.BlockList,
                    Cms.Core.Constants.PropertyEditors.Aliases.RichText
                });

                if (!matchingEditor)
                    continue;

                // Clear the data type cache
                _runtimeCache.ClearByKey(string.Format(Constants.CacheKeys.DataType, savedDataType.Key));

                // Cascade: Clear caches for all content types that use this data type
                if (_contentTypeService != null)
                {
                    var dependentContentTypes = _contentTypeService.GetAll()
                        .Where(ct => ct.PropertyTypes.Any(pt => pt.DataTypeKey == savedDataType.Key) ||
                                     ct.CompositionPropertyTypes.Any(pt => pt.DataTypeKey == savedDataType.Key));

                    foreach (var contentType in dependentContentTypes)
                    {
                        _runtimeCache.ClearByKey(string.Format(Constants.CacheKeys.ContentType, contentType.Key));
                    }
                }
            }
        }
    }
}
