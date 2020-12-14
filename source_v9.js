// Custom function to call instead of the OOTB Add Existing button/command - all 3 parameters can be passed as CRM Parameters from the ribbon
function filterAddExistingContact(selectedEntityTypeName, selectedControl, firstPrimaryItemId) {
    if (selectedControl.getRelationship().name == "new_account_contact") {
        // Custom Account -> Contact N:N - filters to show only contacts with this account as the parentcustomerid
        var options = {
            allowMultiSelect: true,
            defaultEntityType: "contact",
            entityTypes: ["contact"],
            disableMru: true,
            showNew: true,
            searchText: "\n", // Search by default
            filters: [{ 
                entityLogicalName: "contact", 
                filterXml: "<filter type='and'><condition attribute='parentcustomerid' operator='eq' value='" + Xrm.Page.data.entity.getId() + "' /></filter>" 
            }]
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
// lookupOptions = options for creating the custom lookup with filters: https://docs.microsoft.com/en-us/powerapps/developer/model-driven-apps/clientapi/reference/xrm-utility/lookupobjects
function lookupAddExistingRecords(relationshipName, primaryEntity, relatedEntity, parentRecordId, gridControl, lookupOptions) {
    Xrm.Utility.lookupObjects(lookupOptions).then(function (results) {
        if (results.length > 0) {
            // Get the entitySet name for the primary entity
            Xrm.Utility.getEntityMetadata(primaryEntity).then(function (primaryEntityData) {
                var primaryEntitySetName = primaryEntityData.EntitySetName;

                // Get the entitySet name for the related entity
                Xrm.Utility.getEntityMetadata(relatedEntity).then(function (relatedEntityData) {
                    var relatedEntitySetName = relatedEntityData.EntitySetName;

                    // Call the associate web api for each result (recursive)
                    associateAddExistingResults(relationshipName, primaryEntitySetName, relatedEntitySetName, relatedEntity, parentRecordId.replace("{", "").replace("}", ""), gridControl, results, 0)
                });
            });
        }
    });
}

// Used internally by the above function
function associateAddExistingResults(relationshipName, primaryEntitySetName, relatedEntitySetName, relatedEntity, parentRecordId, gridControl, results, index) {
    var formContext = gridControl.formContext;
    
    if (index >= results.length) {
        // Refresh the grid once completed
        formContext.ui.setFormNotification("Associated " + index + " record" + (index > 1 ? "s" : ""), "INFO", "associate");
        if (gridControl) { gridControl.refresh(); }

        // Clear the final notification after 2 seconds
        setTimeout(function () {
            formContext.ui.clearFormNotification("associate");
        }, 2000);

        return;
    }

    formContext.ui.setFormNotification("Associating record " + (index + 1) + " of " + results.length, "INFO", "associate");

    var lookupId = results[index].id.replace("{", "").replace("}", "");
    var lookupEntity = results[index].entityType || results[index].typename;

    var primaryId = parentRecordId;
    var relatedId = lookupId;
    if (lookupEntity.toLowerCase() != relatedEntity.toLowerCase()) {
        // If the related entity is different to the lookup entity flip the primary and related id's
        primaryId = lookupId;
        relatedId = parentRecordId;
    }

    var association = { '@odata.id': formContext.context.getClientUrl() + "/api/data/v9.0/" + relatedEntitySetName + "(" + relatedId + ")" };

    var req = new XMLHttpRequest();
    req.open("POST", formContext.context.getClientUrl() + "/api/data/v9.0/" + primaryEntitySetName + "(" + primaryId + ")/" + relationshipName + "/$ref", true);
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
                associateAddExistingResults(relationshipName, primaryEntitySetName, relatedEntitySetName, relatedEntity, parentRecordId, gridControl, results, index);
            }
            else {
                // Error
                var error = JSON.parse(this.response).error.message;
                if (error == "A record with matching key values already exists.") {
                    // Process the next item in the list
                    associateAddExistingResults(relationshipName, primaryEntitySetName, relatedEntitySetName, relatedEntity, parentRecordId, gridControl, results, index);
                }
                else {
                    Xrm.Utility.alertDialog(error);
                    formContext.ui.clearFormNotification("associate");
                    if (gridControl) { gridControl.refresh(); }
                }
            }
        }
    };
    req.send(JSON.stringify(association));
}
