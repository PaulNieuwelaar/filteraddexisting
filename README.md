# Filter 'Add Existing' N:N Relationship Lookup Dynamics 365

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
