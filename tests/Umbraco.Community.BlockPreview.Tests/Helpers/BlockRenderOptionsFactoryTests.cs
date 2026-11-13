using Moq;
using NUnit.Framework;
using Umbraco.Cms.Core.Models;
using Umbraco.Cms.Core.Models.PublishedContent;
using Umbraco.Community.BlockPreview.Helpers;

namespace Umbraco.Community.BlockPreview.Tests.Helpers;

[TestFixture]
public class BlockRenderOptionsFactoryTests
{
    // Same rule as Umbraco's BlockPropertyVariance.OwningPropertyCulture: the culture only applies when the property
    // varies by culture, narrowed by the variance of the content type that owns it.
    [TestCase(ContentVariation.Culture, ContentVariation.Culture, "da-DK", "da-DK")]
    [TestCase(ContentVariation.Nothing, ContentVariation.Culture, "da-DK", null)]
    [TestCase(ContentVariation.Culture, ContentVariation.Nothing, "da-DK", null)]
    [TestCase(ContentVariation.Culture, ContentVariation.Culture, "", null)]
    public void Create_OwningPropertyCulture_FollowsTheVarianceOfPropertyAndOwner(
        ContentVariation ownerVariation, ContentVariation propertyVariation, string culture, string? expected)
    {
        var content = CreateContent(ownerVariation, "blocks", propertyVariation);

        var options = BlockRenderOptionsFactory.Create(content, "blocks", culture, null);

        Assert.That(options.OwningPropertyCulture, Is.EqualTo(expected));
    }

    [Test]
    public void Create_PropertyNotOnThePage_IsInvariant()
    {
        var content = CreateContent(ContentVariation.Culture, "other", ContentVariation.Culture);

        Assert.That(BlockRenderOptionsFactory.Create(content, "blocks", "da-DK", null).OwningPropertyCulture, Is.Null);
    }

    [Test]
    public void Create_CarriesTheLayoutKey()
    {
        var key = Guid.NewGuid();

        Assert.That(BlockRenderOptionsFactory.Create(null, "blocks", "da-DK", key).LayoutKey, Is.EqualTo(key));
    }

    private static IPublishedContent CreateContent(ContentVariation ownerVariation, string alias, ContentVariation propertyVariation)
    {
        var propertyType = new Mock<IPublishedPropertyType>();
        propertyType.Setup(p => p.Variations).Returns(propertyVariation);
        var contentType = new Mock<IPublishedContentType>();
        contentType.Setup(c => c.Variations).Returns(ownerVariation);
        contentType.Setup(c => c.GetPropertyType(alias)).Returns(propertyType.Object);
        return Mock.Of<IPublishedContent>(c => c.ContentType == contentType.Object);
    }
}
