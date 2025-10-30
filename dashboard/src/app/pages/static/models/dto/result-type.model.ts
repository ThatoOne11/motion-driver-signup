export class ResultType {
  id: string;
  display_name: string;
  field_name: string;
  unit_of_measurement: string;
  active: boolean;

  constructor(
    id: string,
    display_name: string,
    field_name: string,
    unit_of_measurement: string,
    active: boolean
  ) {
    this.id = id;
    this.display_name = display_name;
    this.field_name = field_name;
    this.unit_of_measurement = unit_of_measurement;
    this.active = active;
  }
}
