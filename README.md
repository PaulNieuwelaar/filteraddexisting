# Filter 'Add Existing' N:N Relationship Lookup Dynamics 365

![](https://user-images.githubusercontent.com/14048382/30041528-eb17b56a-923e-11e7-9b63-55fb0042ccb3.png)

The first function shows the generic method for filtering N:N and 1:N add existing lookups. The second function shows an example of how this can be used. The second function (which you should customize to meet your specific requirements) should be used to replace the out-of-the-box function for the Mscrm.AddExistingRecordFromSubGridAssociated (N:N) or Mscrm.AddExistingRecordFromSubGridStandard (1:N) button/command. The parameters passed into the function are the same as the existing command, with the addition of the primary entity name to allow more control over when to filter.

```javascript
// Filters an add existing lookup view (N:N or 1:N) - this function shouldn't need to change
function addExistingFromSubGridCustom(gridTypeCode, gridControl, crmWindow, fetch, layout, viewName) {
    var viewId = "{1DFB2B35-B07C-44D1-868D-258DEEAB88E2}"; // a dummy view ID
    var relName = gridControl.GetParameter("relName");
    var roleOrd = gridControl.GetParameter("roleOrd");

    // Creates the custom view object
    var customView = {
        fetchXml: fetch,
        id: viewId,
        layoutXml: layout,
        name: viewName,
        recordType: gridTypeCode,
        Type: 0
    };

    var parentObj = crmWindow.GetParentObject(null, 0);
    var parameters = [gridTypeCode, "", relName, roleOrd, parentObj];
    var callbackRef = crmWindow.Mscrm.Utilities.createCallbackFunctionObject("locAssocObjAction", crmWindow, parameters, false);

    // Pops the lookup window with our view injected
    crmWindow.LookupObjectsWithCallback(callbackRef, null, "multi", gridTypeCode, 0, null, "", null, null, null, null, null, null, viewId, [customView]);
}

// Filters the Contact N:N lookup view from Account to show only Pauls - this function is unique for your requirements
function filterAddExistingContact(gridTypeCode, gridControl, primaryEntity) {
    var crmWindow = Xrm.Internal.isTurboForm() ? parent.window : window;

    if (primaryEntity != "account") {
        crmWindow.Mscrm.GridRibbonActions.addExistingFromSubGridAssociated(gridTypeCode, gridControl); // Default N:N button click function
        //crmWindow.Mscrm.GridRibbonActions.addExistingFromSubGridStandard(gridTypeCode, gridControl); // Default 1:N button click function
        return;
    }

    // FetchXML to use for the custom view
    var fetch = "<fetch version='1.0' output-format='xml-platform' mapping='logical' distinct='false'>" +
        "  <entity name='contact'>" +
        "    <attribute name='fullname' />" +
        "    <order attribute='fullname' descending='false' />" +
        "    <filter type='and'>" +
        "      <condition attribute='statecode' operator='eq' value='0' />" +
        "      <condition attribute='firstname' operator='eq' value='Paul' />" +
        "    </filter>" +
        "  </entity>" +
        "</fetch>";

    // Columns to display in the custom view (make sure to include these in the fetch query)
    var layout = "<grid name='resultset' object='1' jump='contactid' select='1' icon='1' preview='1'>" +
        "  <row name='result' id='contactid'>" +
        "    <cell name='fullname' width='300' />" +
        "  </row>" +
        "</grid>";

    addExistingFromSubGridCustom(gridTypeCode, gridControl, crmWindow, fetch, layout, "Filtered Contacts");
}
```

Note: This code is unsupported, and is likely to break in any major releases (as it has in the past). The idea of sourcing this project on GitHub is that if/when it does break again, it can be updated here rather than having to release new blog posts and hoping people who have previously used it see it. Also if it breaks in an update and I don't get a chance to fix it, someone else can fix it :)

Created by [Paul Nieuwelaar](http://paulnieuwelaar.wordpress.com) - [@paulnz1](https://twitter.com/paulnz1)  
Sponsored by [Magnetism Solutions - Dynamics CRM Specialists](http://www.magnetismsolutions.com)
