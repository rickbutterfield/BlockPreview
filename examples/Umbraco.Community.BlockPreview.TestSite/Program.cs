using Umbraco.Community.BlockPreview.Extensions;
using Umbraco.Community.BlockPreview.Interfaces;
using Umbraco.Community.BlockPreview.TestSite.Services;

WebApplicationBuilder builder = WebApplication.CreateBuilder(args);

builder.CreateUmbracoBuilder()
    .AddBackOffice()
    .AddWebsite()
    .AddDeliveryApi()
    .AddComposers()
    .AddBlockPreview(options =>
    {
        // This callback runs after the options are bound from configuration, so set properties on the
        // bound sections rather than replacing them. Enabled and Stylesheets are fixed for the test site;
        // everything else (IgnoredContentTypes, ViewLocations, ...) can still come from appsettings or
        // environment variables.
        foreach (var settings in new[] { options.BlockGrid, options.BlockList, options.RichText, options.SingleBlock })
        {
            settings.Enabled = true;
            settings.Stylesheets = ["/css/myblockgridlayout.css"];
        }
    })
    .Build();

builder.Services.AddUnique<IBlockPreviewService, CustomBlockPreviewService>(ServiceLifetime.Scoped);
builder.Services.AddUnique<IBlockPreviewRequestEnricher, BlockPreviewRequestEnricher>(ServiceLifetime.Scoped);
builder.Services.AddUnique<IBlockPreviewResponseEnricher, BlockPreviewResponseEnricher>(ServiceLifetime.Scoped);

WebApplication app = builder.Build();

await app.BootUmbracoAsync();

#if (UseHttpsRedirect)
app.UseHttpsRedirection();
#endif

app.UseUmbraco()
    .WithMiddleware(u =>
    {
        u.UseBackOffice();
        u.UseWebsite();
    })
    .WithEndpoints(u =>
    {
        u.UseBackOfficeEndpoints();
        u.UseWebsiteEndpoints();
    });

await app.RunAsync();
