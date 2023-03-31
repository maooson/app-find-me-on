import { component$ } from "@builder.io/qwik";
import { type DocumentHead, routeLoader$ } from "@builder.io/qwik-city";
import { Facebook } from "~/components/icons/facebook";
import { GitHub } from "~/components/icons/github";
import { LinkedIn } from "~/components/icons/linkedin";
import { Twitter } from "~/components/icons/twitter";
import { User } from "~/components/icons/user";
import { Youtube } from "~/components/icons/youtube";
import { responseDataAdapter } from "~/routes/utils";
import { createClient } from "@libsql/client";

interface SocialLinks {
  website: string;
  link: string;
  id: number;
}

interface UserData {
  full_name: string;
  username: string;
}

interface UserLinksResponse {
  user: UserData | null;
  links: SocialLinks[] | null;
  greeting: string | null;
}

export const ICON_COLOR_STYLE = "fill-teal-700";

export const SocialLink = (props: SocialLinks) => {
  const getIcon = () => {
    if (props.website === "GitHub")
      return <GitHub colorStyle={ICON_COLOR_STYLE} />;
    if (props.website === "Twitter")
      return <Twitter colorStyle={ICON_COLOR_STYLE} />;
    if (props.website === "Youtube")
      return <Youtube colorStyle={ICON_COLOR_STYLE} />;
    if (props.website === "Linkedin")
      return <LinkedIn colorStyle={ICON_COLOR_STYLE} />;
    if (props.website === "Facebook")
      return <Facebook colorStyle={ICON_COLOR_STYLE} />;
  };
  const url = () => {
    if (!props.link.includes("http")) {
      return "https://" + props.link.replace(/^(http(s)?:\/\/)/gi, "https://");
    }
    return props.link;
  };
  return (
    <a class="flex space-x-3" href={url()} target="_blank">
      <div
        id="social-link"
        class="w-full p-2 text-gray-600 bg-teal-200 hover:bg-teal-300 rounded-md flex space-x-3"
      >
        {getIcon()} <span>{props.website}</span>
      </div>
    </a>
  );
};

export const useLinksLoader = routeLoader$(
  async ({ params, status, url }): Promise<UserLinksResponse> => {
    // get local greeting
    const response = await fetch(`${url.origin}/get-local-greeting`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });
    let { greeting } = await response.json();
    greeting = greeting || "Hello";

    const db = createClient({
      url: import.meta.env.VITE_TURSO_DB_URL,
      authToken: import.meta.env.VITE_TURSO_DB_TOKEN,
    });
    const userResponse = await db.execute({
      sql: "select full_name, username, id from users where username = ?;",
      args: [params.username],
    });
    const userData = responseDataAdapter(userResponse);
    if (!userData.length) {
      status(404);
      return {
        user: null,
        links: null,
        greeting,
      };
    }

    const { id } = userData[0];
    const linksResponse = await db.execute({
      sql: "select website, link from links where user_id = ?;",
      args: [id],
    });
    const linksData = responseDataAdapter(linksResponse);

    return {
      user: userData[0],
      links: linksData,
      greeting,
    };
  }
);

export default component$(() => {
  const links = useLinksLoader();

  if (!links.value.user) {
    return (
      <div class="flex flex-col justify-center items-center p-8">
        <div class="text-2xl p-4 text-teal-700">User doesn't exist!</div>
      </div>
    );
  }

  return (
    <div class="p-8 mx-auto max-w-xl">
      <h1 class="p-2 text-center font-bold text-xl text-teal-700 flex justify-center space-x-3">
        {" "}
        <User /> <span>{links.value.user.full_name}</span>
      </h1>
      {links.value.greeting && (
        <p class="text-center text-gray-400">
          <i>{links.value.greeting}</i>
        </p>
      )}
      <div class="p-4 flex flex-col space-y-3">
        {links.value.links!.map((item: SocialLinks) => (
          <div key={item.id}>
            <SocialLink {...item}></SocialLink>
          </div>
        ))}
      </div>
    </div>
  );
});

export const head: DocumentHead = ({ params }) => {
  return {
    title: params.username + " - FindMeOn",
  };
};
