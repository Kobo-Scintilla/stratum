import { Entity, Fields } from "remult";

@Entity("buddyMessages", {
  allowApiCrud: true,
})
export class BuddyMessage {
  @Fields.id()
  id!: string;

  @Fields.string()
  fromUserId = "";

  @Fields.string()
  toUserId = "";

  @Fields.string()
  content = "";

  @Fields.date()
  createdAt = new Date();

  @Fields.boolean()
  read = false;
}
