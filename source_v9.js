// Custom function to call instead of the OOTB Add Existing button/command - all 3 parameters can be passed as CRM Parameters from the ribbon
function filterAddExistingContact(selectedEntityTypeName, selectedControl, firstPrimaryItemId) {
    const relationshipName = selectedControl.getRelationship().name; // Case sensitive
    if (relationshipName === "new_account_contact") {
        // Custom Account -> Contact N:N - filters to show only contacts with this account as the parentcustomerid
        const options = {
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

        lookupAddExistingRecords(relationshipName, "account", "contact", firstPrimaryItemId, selectedControl, options);
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
async function lookupAddExistingRecords(relationshipName, primaryEntity, relatedEntity, parentRecordId, gridControl, lookupOptions) {
    const results = await Xrm.Utility.lookupObjects(lookupOptions);
    if (results.length === 0) { return; }

    // Get the entitySet name for the primary entity
    const primaryEntityData = await Xrm.Utility.getEntityMetadata(primaryEntity);
    const primaryEntitySetName = primaryEntityData.EntitySetName;

    // Get the entitySet name for the related entity
    const relatedEntityData = await Xrm.Utility.getEntityMetadata(relatedEntity);
    const relatedEntitySetName = relatedEntityData.EntitySetName;

    const formContext = gridControl.formContext ?? gridControl.getParentForm();
    const baseUrl = formContext.context.getClientUrl();

    parentRecordId = parentRecordId.replace("{", "").replace("}", "");

    // Call the associate web api for each result
    for (let i = 0; i < results.length; i++) {
        const lookupId = results[i].id.replace("{", "").replace("}", "");
        const lookupEntity = results[i].entityType ?? results[i].typename;

        let primaryId = parentRecordId;
        let relatedId = lookupId;
        if (lookupEntity.toLowerCase() !== relatedEntity.toLowerCase()) {
            // If the related entity is different to the lookup entity flip the primary and related id's
            primaryId = lookupId;
            relatedId = parentRecordId;
        }

        const association = { '@odata.id': baseUrl + "/api/data/v9.0/" + relatedEntitySetName + "(" + relatedId + ")" };

        const response = await fetch(baseUrl + "/api/data/v9.0/" + primaryEntitySetName + "(" + primaryId + ")/" + relationshipName + "/$ref", {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json; charset=utf-8',
                'OData-MaxVersion': '4.0',
                'OData-Version': '4.0',
            },
            body: JSON.stringify(association)
        });

        if (!response.ok) {
            const data = await response.json();
            console.error(data);

            if (data != null && data.error != null && data.error.message != "A record with matching key values already exists.") {
                Xrm.Navigation.openAlertDialog({ title: "Error associating record", text: data.error.message });
                break;
            }
        }
    }

    if (gridControl) { gridControl.refresh(); }
}
