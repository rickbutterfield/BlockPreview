using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using NUnit.Framework;
using Umbraco.Community.BlockPreview.Extensions;

namespace Umbraco.Community.BlockPreview.Tests.Extensions;

[TestFixture]
public class HttpRequestExtensionsTests
{
    private static HttpRequest CreateRequest(RouteValueDictionary? routeValues = null)
    {
        var context = new DefaultHttpContext();

        if (routeValues != null)
        {
            foreach (var kvp in routeValues)
            {
                context.Request.RouteValues[kvp.Key] = kvp.Value;
            }
        }

        return context.Request;
    }

    [Test]
    public void IsBlockPreviewRequest_WithPreviewGridBlock_ReturnsTrue()
    {
        var request = CreateRequest(new RouteValueDictionary
        {
            { "controller", "BlockPreviewApi" },
            { "action", "PreviewGridBlock" }
        });

        Assert.That(request.IsBlockPreviewRequest(), Is.True);
    }

    [Test]
    public void IsBlockPreviewRequest_WithPreviewListBlock_ReturnsTrue()
    {
        var request = CreateRequest(new RouteValueDictionary
        {
            { "controller", "BlockPreviewApi" },
            { "action", "PreviewListBlock" }
        });

        Assert.That(request.IsBlockPreviewRequest(), Is.True);
    }

    [Test]
    public void IsBlockPreviewRequest_WithPreviewRichTextMarkup_ReturnsTrue()
    {
        var request = CreateRequest(new RouteValueDictionary
        {
            { "controller", "BlockPreviewApi" },
            { "action", "PreviewRichTextMarkup" }
        });

        Assert.That(request.IsBlockPreviewRequest(), Is.True);
    }

    [Test]
    public void IsBlockPreviewRequest_WithPreviewSingleBlock_ReturnsTrue()
    {
        var request = CreateRequest(new RouteValueDictionary
        {
            { "controller", "BlockPreviewApi" },
            { "action", "PreviewSingleBlock" }
        });

        Assert.That(request.IsBlockPreviewRequest(), Is.True);
    }

    [Test]
    public void IsBlockPreviewRequest_WithMissingRouteValues_ReturnsFalse()
    {
        var request = CreateRequest();

        Assert.That(request.IsBlockPreviewRequest(), Is.False);
    }

    [Test]
    public void IsBlockPreviewRequest_WithMissingController_ReturnsFalse()
    {
        var request = CreateRequest(new RouteValueDictionary
        {
            { "action", "PreviewGridBlock" }
        });

        Assert.That(request.IsBlockPreviewRequest(), Is.False);
    }

    [Test]
    public void IsBlockPreviewRequest_WithMissingAction_ReturnsFalse()
    {
        var request = CreateRequest(new RouteValueDictionary
        {
            { "controller", "BlockPreviewApi" }
        });

        Assert.That(request.IsBlockPreviewRequest(), Is.False);
    }

    [Test]
    public void IsBlockPreviewRequest_WithNullRouteValues_ReturnsFalse()
    {
        var request = CreateRequest(new RouteValueDictionary
        {
            { "controller", null },
            { "action", null }
        });

        Assert.That(request.IsBlockPreviewRequest(), Is.False);
    }

    [Test]
    public void IsBlockPreviewRequest_WithWrongController_ReturnsFalse()
    {
        var request = CreateRequest(new RouteValueDictionary
        {
            { "controller", "SomeOther" },
            { "action", "PreviewGridBlock" }
        });

        Assert.That(request.IsBlockPreviewRequest(), Is.False);
    }

    [Test]
    public void IsBlockPreviewRequest_WithWrongAction_ReturnsFalse()
    {
        var request = CreateRequest(new RouteValueDictionary
        {
            { "controller", "BlockPreviewApi" },
            { "action", "SomeOtherAction" }
        });

        Assert.That(request.IsBlockPreviewRequest(), Is.False);
    }

    [Test]
    public void IsBlockPreviewRequest_WithNonStringRouteValues_ReturnsFalse()
    {
        var request = CreateRequest(new RouteValueDictionary
        {
            { "controller", 123 },
            { "action", 456 }
        });

        Assert.That(request.IsBlockPreviewRequest(), Is.False);
    }
}
