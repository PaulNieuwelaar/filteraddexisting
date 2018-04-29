// Custom function to call instead of the OOTB Add Existing button/command - all 3 parameters can be passed as CRM Parameters from the ribbon
function filterAddExistingContact(selectedEntityTypeName, selectedControl, firstPrimaryItemId) {
    if (selectedControl.getRelationshipName() == "new_account_contact") {
        // Custom Account -> Contact N:N - filters to show only contacts with this account as the parentcustomerid
        var options = {
            allowMultiSelect: true,
            entityTypes: ["contact"],
            showNew: true,
            customFilterTypes: [""],
            customFilters: [encodeURIComponent("<filter type='and'><condition attribute='parentcustomerid' operator='eq' value='" + Xrm.Page.data.entity.getId() + "' /></filter>")]
        };

        lookupAddExistingRecords("new_account_contact", "account", "contact", firstPrimaryItemId, selectedControl, options);
    }
    else {
        // Any other contact relationship (N:N or 1:N) - use default behaviour
        XrmCore.Commands.AddFromSubGrid.addExistingFromSubGridAssociated(selectedEntityTypeName, selectedControl);
    }
}

// relationshipName = the schema name of the N:N or 1:N relationship
// primaryEntity = the 1 in the 1:N or the first entity in the N:N - for N:N this is the entity which was used to create the N:N (may need to trial and error this)
// relatedEntity = the N in the 1:N or the secondary entity in the N:N
// parentRecordId = the guid of the record this subgrid/related entity is used on
// gridControl = the grid control parameter passed from the ribbon context
// lookupOptions = options for creating the custom lookup with filters: http://butenko.pro/2017/11/22/microsoft-dynamics-365-v9-0-lookupobjects-closer-look/
function lookupAddExistingRecords(relationshipName, primaryEntity, relatedEntity, parentRecordId, gridControl, lookupOptions) {
    Xrm.Utility.lookupObjects(lookupOptions).then(function (results) {
        associateAddExistingResults(relationshipName, primaryEntity, relatedEntity, parentRecordId.replace("{", "").replace("}", ""), gridControl, results, 0)
    });
}

// Used internally by the above function
function associateAddExistingResults(relationshipName, primaryEntity, relatedEntity, parentRecordId, gridControl, results, index) {
    if (index >= results.length) {
        // Refresh the grid once completed
        Xrm.Page.ui.clearFormNotification("associate");
        if (gridControl) { gridControl.refresh(); }
        return;
    }

    Xrm.Page.ui.setFormNotification("Associating record " + (index + 1) + " of " + results.length, "INFO", "associate");

    var lookupId = results[index].id.replace("{", "").replace("}", "");
    var lookupEntity = results[index].typename;

    var primaryId = parentRecordId;
    var relatedId = lookupId;
    if (lookupEntity.toLowerCase() != relatedEntity.toLowerCase()) {
        // If the related entity is different to the lookup entity flip the primary and related id's
        primaryId = lookupId;
        relatedId = parentRecordId;
    }

    var association = { '@odata.id': Xrm.Page.context.getClientUrl() + "/api/data/v9.0/" + relatedEntity + "s(" + relatedId + ")" };

    var req = new XMLHttpRequest();
    req.open("POST", Xrm.Page.context.getClientUrl() + "/api/data/v9.0/" + primaryEntity + "s(" + primaryId + ")/" + relationshipName + "/$ref", true);
    req.setRequestHeader("Accept", "application/json");
    req.setRequestHeader("Content-Type", "application/json; charset=utf-8");
    req.setRequestHeader("OData-MaxVersion", "4.0");
    req.setRequestHeader("OData-Version", "4.0");
    req.onreadystatechange = function () {
        if (this.readyState === 4) {
            req.onreadystatechange = null;
            index++;
            if (this.status === 204 || this.status === 1223) {
                // Success
                // Process the next item in the list
                associateAddExistingResults(relationshipName, primaryEntity, relatedEntity, parentRecordId, gridControl, results, index);
            }
            else {
                // Error
                var error = JSON.parse(this.response).error.message;
                if (error == "A record with matching key values already exists.") {
                    // Process the next item in the list
                    associateAddExistingResults(relationshipName, primaryEntity, relatedEntity, parentRecordId, gridControl, results, index);
                }
                else {
                    Xrm.Utility.alertDialog(error);
                    Xrm.Page.ui.clearFormNotification("associate");
                    if (gridControl) { gridControl.refresh(); }
                }
            }
        }
    };
    req.send(JSON.stringify(association));
}
