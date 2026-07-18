from backend.app.schemas import (
    ClaimElement,
    DecomposedClaim,
    RetrievedDocument,
    PriorArtSearchResponse
)

def test_schemas_importable():
    # If this file runs, schemas are importable and have no circular dependencies
    assert ClaimElement
    assert DecomposedClaim
    assert RetrievedDocument
    assert PriorArtSearchResponse

def test_claim_element_validation():
    # Valid
    elem = ClaimElement(element_id="1", text="A device", element_type="structural")
    assert elem.element_id == "1"
