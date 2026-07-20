from pydantic import BaseModel, Field, field_validator


class EditRequest(BaseModel):
    link_group_id: str = Field(min_length=1, max_length=36)
    replacement_text: str = Field(min_length=1, max_length=20_000)

    @field_validator("replacement_text")
    @classmethod
    def replacement_must_contain_visible_text(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Replacement text cannot be blank.")
        return cleaned
