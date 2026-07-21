from pydantic import BaseModel, Field, field_validator


class EditRequest(BaseModel):
    link_group_id: str = Field(min_length=1, max_length=36)
    replacement_text: str = Field(min_length=1, max_length=20_000)
    source_element_id: str | None = Field(default=None, min_length=1, max_length=36)
    included_element_ids: list[str] | None = Field(
        default=None,
        min_length=1,
        max_length=500,
    )

    @field_validator("replacement_text")
    @classmethod
    def replacement_must_contain_visible_text(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Replacement text cannot be blank.")
        return cleaned

    @field_validator("included_element_ids")
    @classmethod
    def included_elements_must_be_unique(cls, value: list[str] | None) -> list[str] | None:
        if value is None:
            return None
        if any(not element_id.strip() for element_id in value):
            raise ValueError("Included element IDs cannot be blank.")
        if len(set(value)) != len(value):
            raise ValueError("Included element IDs must be unique.")
        return value
