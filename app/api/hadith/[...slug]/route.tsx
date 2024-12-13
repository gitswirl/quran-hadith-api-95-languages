import { NextResponse } from "next/server";
import { BookLangDetails } from "./BookLangArray";
interface ParamsType {
  params: { slug: string[] };
}

const fetchData = async (url: string) => {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to fetch from ${url}`);
    return await res.json();
  } catch (error) {
    throw new Error(`Error fetching data: ${error}`);
  }
};

export async function GET(request: Request, { params }: ParamsType) {
  try {
    const [bookName_prm, language_prm, chapter_chunk_nd_verse_prm] =
      params.slug;

    // Book existence check
    const bookExist = BookLangDetails.findIndex(
      (elem) => elem.book === bookName_prm
    );
    if (bookExist === -1) {
      return NextResponse.json(
        { error: "Book not found", message: `${bookName_prm} doesn't exist` },
        { status: 404 }
      );
    }

    // Fetching default language (English) metadata
    if (!language_prm) {
      const apiURL = `https://raw.githubusercontent.com/haseebllc/quran-hadith-json/refs/heads/main/hadith/chunk-file/book/${bookName_prm}/metadata.json`;
      const jsonData = await fetchData(apiURL);
      return NextResponse.json(jsonData, { status: 200 });
    }

    // Language existence check
    const langExist = BookLangDetails.find(
      (elem) => elem.language === language_prm
    );
    if (!langExist) {
      return NextResponse.json(
        {
          error: "Language not found",
          message: `${language_prm} language doesn't exist in ${bookName_prm}`,
        },
        { status: 404 }
      );
    }

    // Fetching full book if no chunk is provided
    if (!chapter_chunk_nd_verse_prm) {
      const apiURL = `https://raw.githubusercontent.com/haseebllc/quran-hadith-json/refs/heads/main/hadith/single-file/book/${bookName_prm}/${language_prm}.json`;
      const jsonData = await fetchData(apiURL);
      return NextResponse.json(jsonData, { status: 200 });
    }

    // Handling chunk-based request
    const cc_nd_vp = chapter_chunk_nd_verse_prm.replace(/\d+/g, "");
    if (cc_nd_vp === "verse") {
      let verse = Number(chapter_chunk_nd_verse_prm.replace(/verse/, ""));
      const apiURL = `https://raw.githubusercontent.com/haseebllc/quran-hadith-json/refs/heads/main/hadith/chunk-file/book/${bookName_prm}/metadata.json`;
      const data = await fetchData(apiURL);

      const iOfMatch = data.chapter_details.findIndex(
        (elem: any) =>
          verse >= elem.first_hadith_num && verse <= elem.last_hadith_num
      );

      if (iOfMatch !== -1) {
        const chunkAPI = `https://raw.githubusercontent.com/haseebllc/quran-hadith-json/refs/heads/main/hadith/chunk-file/book/${bookName_prm}/${language_prm}/chapter${
          iOfMatch + 1
        }.json`;
        const data_iOfMatch = await fetchData(chunkAPI);
        const exactElem = data_iOfMatch.hadith_list.find(
          (elem: any) => elem.hadithNum_inBook === verse
        );
        return NextResponse.json(exactElem || { error: "Hadith not found" }, {
          status: 200,
        });
      } else {
        return NextResponse.json(
          { error: "Chapter not found for the verse" },
          { status: 404 }
        );
      }
    } else {
      const apiURL = `https://raw.githubusercontent.com/haseebllc/quran-hadith-json/refs/heads/main/hadith/chunk-file/book/${bookName_prm}/${language_prm}/${chapter_chunk_nd_verse_prm}.json`;
      const jsonData = await fetchData(apiURL);
      return NextResponse.json(jsonData, { status: 200 });
    }
  } catch (err) {
    console.error("Error:", err);
    return NextResponse.json(
      { status: 500, message: "server err! try later." },
      { status: 500 }
    );
  }
}
